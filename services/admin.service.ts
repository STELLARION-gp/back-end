// services/admin.service.ts
import { PrismaClient } from "../prisma/generated/client";

const prisma = new PrismaClient();

/**
 * Get user counts by role
 */
export const getUsersByRole = async () => {
  const [
    learners,
    mentors,
    influencers,
    guides,
    enthusiasts,
    moderators,
    admins,
    totalUsers,
    activeUsers,
  ] = await Promise.all([
    prisma.users.count({ where: { role: "learner" } }),
    prisma.users.count({ where: { role: "mentor" } }),
    prisma.users.count({ where: { role: "influencer" } }),
    prisma.users.count({ where: { role: "guide" } }),
    prisma.users.count({ where: { role: "enthusiast" } }),
    prisma.users.count({ where: { role: "moderator" } }),
    prisma.users.count({ where: { role: "admin" } }),
    prisma.users.count(),
    prisma.users.count({ where: { is_active: true } }),
  ]);

  return {
    learners,
    mentors,
    influencers,
    guides,
    enthusiasts,
    moderators,
    admins,
    total: totalUsers,
    activeUsers,
  };
};

/**
 * Get general statistics
 */
export const getGeneralStats = async () => {
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

  return {
    users: { total: totalUsers, active: activeUsers },
    content: { totalBlogs, publishedBlogs, totalQuizzes },
    events: { active: activeEvents },
    subscriptions: { active: activeSubscriptions },
  };
};

/**
 * Get recent activity (users, blogs, quizzes)
 */
export const getRecentActivity = async () => {
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

  return {
    recentUsers,
    recentBlogs,
    recentQuizzes,
  };
};

/**
 * Get recent sessions from sessions table
 */
export const getRecentSessions = async (limit: number = 5) => {
  const sessions = await prisma.sessions.findMany({
    take: limit,
    orderBy: { session_date: "desc" },
    where: {
      is_enabled: true,
    },
    include: {
      creator: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    host_name: session.creator
      ? `${session.creator.first_name} ${session.creator.last_name}`
      : "Unknown",
    host_email: session.creator?.email,
    host_role: session.creator?.role,
    session_type: session.session_type,
    payment_type: session.payment_type,
    price: session.price,
    session_date: session.session_date,
    session_time: session.session_time,
    duration: session.duration,
    max_participants: session.max_participants,
    difficulty_level: session.difficulty_level,
    session_status: session.status,
    created_at: session.created_at,
  }));
};

/**
 * Get top guide services from services table
 */
export const getTopGuideServices = async (limit: number = 5) => {
  const services = await prisma.services.findMany({
    where: {
      is_active: true,
      status: "active",
    },
    take: limit,
    orderBy: [
      { rating: "desc" },
      { review_count: "desc" },
      { bookings_count: "desc" },
    ],
    include: {
      users: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          is_active: true,
        },
      },
    },
  });

  return services.map((service) => ({
    id: service.id,
    guide_name: `${service.users.first_name} ${service.users.last_name}`,
    guide_email: service.users.email,
    service_title: service.title,
    specialty: service.category,
    description: service.description,
    price: service.price,
    duration: service.duration,
    max_participants: service.max_participants,
    difficulty: service.difficulty,
    total_sessions: service.bookings_count,
    avg_rating: service.rating,
    review_count: service.review_count,
    status: service.status,
    featured: service.featured,
    created_at: service.created_at,
  }));
};

/**
 * Get platform overview with time-based filtering
 */
export const getPlatformOverview = async (timeRange: string = "30d") => {
  const now = new Date();
  let startDate = new Date();

  switch (timeRange) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  const [
    totalUsers,
    activeUsers,
    newUsersInRange,
    totalBlogs,
    publishedBlogs,
    totalEvents,
    activeEvents,
    totalSessions,
    activeSessions,
    totalServices,
    activeServices,
    activeSubscriptions,
    totalRevenue,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.users.count({ where: { is_active: true } }),
    prisma.users.count({ where: { created_at: { gte: startDate } } }),
    prisma.blogs.count(),
    prisma.blogs.count({ where: { status: "published" } }),
    prisma.astronomy_events.count(),
    prisma.astronomy_events.count({ where: { is_active: true } }),
    prisma.sessions.count(),
    prisma.sessions.count({ where: { status: "approved" } }),
    prisma.services.count(),
    prisma.services.count({ where: { is_active: true, status: "active" } }),
    prisma.subscriptions.count({ where: { status: "active" } }),
    prisma.payments.aggregate({
      _sum: { amount: true },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      newInRange: newUsersInRange,
    },
    content: {
      totalBlogs,
      publishedBlogs,
    },
    events: {
      total: totalEvents,
      active: activeEvents,
    },
    sessions: {
      total: totalSessions,
      active: activeSessions,
    },
    services: {
      total: totalServices,
      active: activeServices,
    },
    subscriptions: {
      active: activeSubscriptions,
    },
    revenue: {
      total: totalRevenue._sum.amount || 0,
    },
    timeRange,
  };
};

/**
 * Toggle user active status
 */
export const toggleUserStatus = async (userId: number) => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const updatedUser = await prisma.users.update({
    where: { id: userId },
    data: { is_active: !user.is_active },
  });

  return {
    user: updatedUser,
    message: `User ${updatedUser.is_active ? "activated" : "deactivated"}`,
  };
};
