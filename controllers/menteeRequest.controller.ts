import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ok, created, fail } from "../utils/responses";

// Helpers
const isMentor = (role?: string) => role === 'mentor' || role === 'admin' || role === 'moderator';

export const MenteeRequestController = {
  // GET /api/mentee-requests
  // If current user is a mentor -> list requests for mentor_id = userId
  // If current user is a mentee -> list requests for mentee_id = userId
  async list(req: Request, res: Response) {
    try {
      const auth = (req as any).user;
      if (!auth?.userId) return fail(res, 401, "Unauthorized");

      const page = Math.max(parseInt(String(req.query.page ?? '1')), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20')), 1), 100);
      const offset = (page - 1) * limit;

      const forMentor = isMentor(auth.role);
      const where = forMentor ? { mentor_id: auth.userId } : { mentee_id: auth.userId };

      const [items, total] = await prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(
          `SELECT mr.*, 
                  m.first_name AS mentor_first_name, m.last_name AS mentor_last_name, m.email AS mentor_email,
                  e.first_name AS mentee_first_name, e.last_name AS mentee_last_name, e.email AS mentee_email
             FROM mentee_requests mr
             JOIN users m ON m.id = mr.mentor_id
             JOIN users e ON e.id = mr.mentee_id
            WHERE ${forMentor ? 'mr.mentor_id' : 'mr.mentee_id'} = $1
            ORDER BY mr.created_at DESC
            LIMIT $2 OFFSET $3`,
          auth.userId, limit, offset
        ),
        prisma.$queryRawUnsafe<{ count: string }[]>(
          `SELECT COUNT(*)::text AS count FROM mentee_requests WHERE ${forMentor ? 'mentor_id' : 'mentee_id'} = $1`,
          auth.userId
        )
      ]);

      const totalNum = parseInt(total[0]?.count ?? '0', 10);
      return ok(res, "Mentee requests fetched", {
        items,
        pagination: {
          page,
          limit,
          total: totalNum,
          totalPages: Math.ceil(totalNum / limit)
        }
      });
    } catch (err: any) {
      return fail(res, 500, "Failed to fetch mentee requests", err?.message);
    }
  },

  // GET /api/mentee-requests/:id
  async getById(req: Request, res: Response) {
    try {
      const auth = (req as any).user;
      if (!auth?.userId) return fail(res, 401, "Unauthorized");
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return fail(res, 400, "Invalid id");

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT mr.*, 
                m.first_name AS mentor_first_name, m.last_name AS mentor_last_name, m.email AS mentor_email,
                e.first_name AS mentee_first_name, e.last_name AS mentee_last_name, e.email AS mentee_email
           FROM mentee_requests mr
           JOIN users m ON m.id = mr.mentor_id
           JOIN users e ON e.id = mr.mentee_id
          WHERE mr.id = $1`,
        id
      );

      const record = rows[0];
      if (!record) return fail(res, 404, "Request not found");

      // Access control: only mentor or mentee involved can view
      if (record.mentor_id !== auth.userId && record.mentee_id !== auth.userId) {
        return fail(res, 403, "Forbidden");
      }

      return ok(res, "Mentee request", record);
    } catch (err: any) {
      return fail(res, 500, "Failed to get request", err?.message);
    }
  },

  // POST /api/mentee-requests/:id/accept  (mentor only)
  async accept(req: Request, res: Response) {
    try {
      const auth = (req as any).user;
      if (!auth?.userId) return fail(res, 401, "Unauthorized");
      if (!isMentor(auth.role)) return fail(res, 403, "Only mentors can accept requests");

      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return fail(res, 400, "Invalid id");

      const updated = await prisma.$executeRawUnsafe(
        `UPDATE mentee_requests
            SET status = 'accepted', updated_at = NOW()
          WHERE id = $1 AND mentor_id = $2 AND status = 'pending'`,
        id, auth.userId
      );

      if (updated === 0) return fail(res, 404, "Pending request not found or not owned by mentor");
      return ok(res, "Request accepted");
    } catch (err: any) {
      return fail(res, 500, "Failed to accept request", err?.message);
    }
  },

  // DELETE /api/mentee-requests/:id  (mentor can delete, mentee can delete only if pending)
  async remove(req: Request, res: Response) {
    try {
      const auth = (req as any).user;
      if (!auth?.userId) return fail(res, 401, "Unauthorized");

      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return fail(res, 400, "Invalid id");

      // Fetch the record to check ownership & status
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM mentee_requests WHERE id = $1`,
        id
      );
      const record = rows[0];
      if (!record) return fail(res, 404, "Request not found");

      const isMentorOwner = record.mentor_id === auth.userId;
      const isMenteeOwner = record.mentee_id === auth.userId;

      if (!isMentorOwner && !isMenteeOwner) return fail(res, 403, "Forbidden");

      // Mentee can only delete if still pending; mentor can always delete
      if (isMenteeOwner && record.status !== 'pending') {
        return fail(res, 400, "Mentees can only delete pending requests");
      }

      await prisma.$executeRawUnsafe(`DELETE FROM mentee_requests WHERE id = $1`, id);
      return ok(res, "Request deleted");
    } catch (err: any) {
      return fail(res, 500, "Failed to delete request", err?.message);
    }
  }
};
