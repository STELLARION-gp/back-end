import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ok, created, fail } from '../utils/responses';
import cloudinary from '../config/cloudinary';

function isYouTubeUrl(url: string) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes('youtube.com') ||
      u.hostname.includes('youtu.be')
    );
  } catch {
    return false;
  }
}

async function uploadBufferToCloudinary(buffer: Buffer, filename: string, folder: string): Promise<{ url: string; public_id: string; }>{
  return new Promise((resolve, reject) => {
    const stream: any = cloudinary.uploader.upload_stream({
      folder,
      resource_type: 'raw',
      public_id: filename.replace(/[^a-zA-Z0-9_-]/g,'_') + '_' + Date.now(),
      format: 'pdf'
    }, (error, result) => {
      if (error) return reject(error);
      if (!result) return reject(new Error('Empty Cloudinary result'));
      resolve({ url: result.secure_url, public_id: result.public_id });
    });
    stream.end(buffer);
  });
}

export const RecommendedContentController = {
  // GET /api/mentors/recommended-contents
  async list(req: Request, res: Response) {
    try {
      const auth: any = (req as any).user;
      if (!auth?.userId) return fail(res, 401, 'Authentication required');
      // Mentors see their own; admins/moderators can pass mentor_id to filter
      const mentorId = (req.query.mentor_id ? parseInt(String(req.query.mentor_id), 10) : auth.userId);

      const page = Math.max(parseInt(String(req.query.page ?? '1')), 1);
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20')), 1), 100);
      const offset = (page - 1) * limit;

      const [items, total] = await prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(
          `SELECT rc.*, u.first_name, u.last_name, u.email
             FROM recommended_contents rc
             JOIN users u ON u.id = rc.mentor_id
            WHERE rc.mentor_id = $1
            ORDER BY rc.created_at DESC
            LIMIT $2 OFFSET $3`,
          mentorId, limit, offset
        ),
        prisma.$queryRawUnsafe<{ count: string }[]>(
          `SELECT COUNT(*)::text AS count FROM recommended_contents WHERE mentor_id = $1`,
          mentorId
        )
      ]);

      const totalNum = parseInt(total[0]?.count ?? '0', 10);
      return ok(res, 'Recommended contents fetched', {
        items,
        pagination: { page, limit, total: totalNum, totalPages: Math.ceil(totalNum / limit) }
      });
    } catch (err: any) {
      return fail(res, 500, 'Failed to fetch contents', err?.message);
    }
  },

  // POST /api/mentors/recommended-contents/youtube
  async createYouTube(req: Request, res: Response) {
    try {
      const auth: any = (req as any).user;
      if (!auth?.userId) return fail(res, 401, 'Authentication required');
      if (auth.role !== 'mentor' && auth.role !== 'admin' && auth.role !== 'moderator') {
        return fail(res, 403, 'Only mentors or admins can add content');
      }

      const { title, description, url } = req.body || {};
      if (!title || !url) return fail(res, 400, 'title and url are required');
      if (!isYouTubeUrl(url)) return fail(res, 400, 'Invalid YouTube URL');

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO recommended_contents (mentor_id, title, description, source_type, url)
         VALUES ($1,$2,$3,'youtube',$4) RETURNING *`,
        auth.userId, title, description ?? null, url
      );

      return created(res, 'YouTube content added', rows[0]);
    } catch (err: any) {
      return fail(res, 500, 'Failed to add YouTube link', err?.message);
    }
  },

  // POST /api/mentors/recommended-contents/pdf (multipart form-data with field 'file')
  async uploadPdf(req: Request, res: Response) {
    try {
      const auth: any = (req as any).user;
      if (!auth?.userId) return fail(res, 401, 'Authentication required');
      if (auth.role !== 'mentor' && auth.role !== 'admin' && auth.role !== 'moderator') {
        return fail(res, 403, 'Only mentors or admins can add content');
      }

      if (!req.file) return fail(res, 400, 'PDF file required');
      if (req.file.mimetype !== 'application/pdf') return fail(res, 400, 'Only PDF files are allowed');

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return fail(res, 500, 'Cloudinary environment variables not set');
      }

      const buffer = (req.file as any).buffer as Buffer | undefined;
      if (!buffer) return fail(res, 500, 'No file buffer (memoryStorage required)');

      const folder = `recommended/mentor_${auth.userId}`;
      const uploaded = await uploadBufferToCloudinary(buffer, req.file.originalname, folder);

      const { title, description } = req.body || {};
      if (!title) return fail(res, 400, 'title is required');

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `INSERT INTO recommended_contents (mentor_id, title, description, source_type, url, metadata)
         VALUES ($1,$2,$3,'pdf',$4,$5) RETURNING *`,
        auth.userId,
        title,
        description ?? null,
        uploaded.url,
        JSON.stringify({ public_id: uploaded.public_id, original_name: req.file.originalname })
      );

      return created(res, 'PDF uploaded', rows[0]);
    } catch (err: any) {
      return fail(res, 500, 'Failed to upload PDF', err?.message);
    }
  },

  // DELETE /api/mentors/recommended-contents/:id
  async remove(req: Request, res: Response) {
    try {
      const auth: any = (req as any).user;
      if (!auth?.userId) return fail(res, 401, 'Authentication required');

      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return fail(res, 400, 'Invalid id');

      // fetch record for authorization
      const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM recommended_contents WHERE id = $1`, id);
      const record = rows[0];
      if (!record) return fail(res, 404, 'Content not found');

      const isOwner = record.mentor_id === auth.userId;
      const isAdmin = auth.role === 'admin' || auth.role === 'moderator';
      if (!isOwner && !isAdmin) return fail(res, 403, 'Forbidden');

      await prisma.$executeRawUnsafe(`DELETE FROM recommended_contents WHERE id = $1`, id);
      return ok(res, 'Content deleted');
    } catch (err: any) {
      return fail(res, 500, 'Failed to delete content', err?.message);
    }
  }
};
