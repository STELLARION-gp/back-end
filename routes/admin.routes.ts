import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "../prisma/generated/client";
import { verifyAdminToken } from "../admin/auth";

const router = Router();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify admin authentication via Firebase token
 */
const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const user = await verifyAdminToken(token);

    if (!user) {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * GET /api/admin/stats
 * Get dashboard statistics (for API access)
 */
router.get("/stats", adminAuthMiddleware, async (_req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalBlogs,
      publishedBlogs,
      totalQuizzes,
      activeEvents,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { is_active: true } }),
      prisma.blogs.count(),
      prisma.blogs.count({ where: { status: "published" } }),
      prisma.quizzes.count(),
      prisma.astronomy_events.count({ where: { is_active: true } }),
      prisma.subscriptions.count({ where: { status: "active" } }),
    ]);

    res.json({
      success: true,
      data: {
        users: { total: totalUsers, active: activeUsers },
        content: { totalBlogs, publishedBlogs, totalQuizzes },
        events: { active: activeEvents },
        subscriptions: { active: activeSubscriptions },
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

/**
 * POST /api/admin/users/:id/toggle-status
 * Toggle user active status
 */
router.post(
  "/users/:id/toggle-status",
  adminAuthMiddleware,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      const user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: { is_active: !user.is_active },
      });

      res.json({
        success: true,
        data: updatedUser,
        message: `User ${updatedUser.is_active ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Toggle status error:", error);
      res.status(500).json({ error: "Failed to update user status" });
    }
  }
);

/**
 * GET /api/admin/recent-activity
 * Get recent system activity
 */
router.get("/recent-activity", adminAuthMiddleware, async (_req, res) => {
  try {
    const [recentUsers, recentBlogs, recentQuizzes] = await Promise.all([
      prisma.users.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          role: true,
          created_at: true,
        },
      }),
      prisma.blogs.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          title: true,
          author_name: true,
          status: true,
          created_at: true,
        },
      }),
      prisma.quizzes.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          created_at: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        recentUsers,
        recentBlogs,
        recentQuizzes,
      },
    });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
});

export default router;
