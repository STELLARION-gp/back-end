import { PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

/**
 * Dashboard handler to fetch statistics
 */
export const dashboardHandler = async () => {
  try {
    // Fetch various statistics
    const [
      totalUsers,
      activeUsers,
      totalBlogs,
      publishedBlogs,
      totalQuizzes,
      totalEvents,
      totalSubscriptions,
      recentUsers,
    ] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { is_active: true } }),
      prisma.blogs.count(),
      prisma.blogs.count({ where: { status: "published" } }),
      prisma.quizzes.count(),
      prisma.astronomy_events.count({ where: { is_active: true } }),
      prisma.subscriptions.count(),
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
    ]);

    // Calculate user role distribution
    const usersByRole = await prisma.users.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    // Subscription tier is not in the schema, so we'll skip it
    // const subscriptionsByTier = await prisma.users.groupBy({
    //   by: ['subscription_tier'],
    //   _count: { subscription_tier: true },
    // });

    return {
      statistics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole.map((r) => ({
            role: r.role,
            count: r._count.role,
          })),
        },
        content: {
          totalBlogs,
          publishedBlogs,
          totalQuizzes,
          activeEvents: totalEvents,
        },
        subscriptions: {
          active: totalSubscriptions,
          byTier: [], // Removed as subscription_tier doesn't exist in schema
        },
      },
      recentUsers,
    };
  } catch (error) {
    console.error("Dashboard error:", error);
    return {
      statistics: {
        users: { total: 0, active: 0, byRole: [] },
        content: {
          totalBlogs: 0,
          publishedBlogs: 0,
          totalQuizzes: 0,
          activeEvents: 0,
        },
        subscriptions: { active: 0, byTier: [] },
      },
      recentUsers: [],
    };
  }
};
