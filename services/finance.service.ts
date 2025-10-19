// services/finance.service.ts
import { prisma } from "../lib/prisma";

/**
 * Get revenue overview with total and breakdown by source
 */
export const getRevenueOverview = async (timeRange: string = "30d") => {
  const { startDate } = getDateRange(timeRange);

  // Subscription payments
  const subscriptionRevenue = await prisma.payments.aggregate({
    where: {
      payment_status: "completed",
      payment_date: { gte: startDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  // Service booking payments
  const serviceRevenue = await prisma.service_bookings.aggregate({
    where: {
      payment_status: "completed",
      created_at: { gte: startDate },
    },
    _sum: { total_amount: true },
    _count: true,
  });

  // Session enrollment payments
  const sessionRevenue = await prisma.session_enrollments.aggregate({
    where: {
      payment_status: "completed",
      enrollment_date: { gte: startDate },
    },
    _sum: { payment_amount: true },
    _count: true,
  });

  const totalRevenue =
    Number(subscriptionRevenue._sum.amount || 0) +
    Number(serviceRevenue._sum.total_amount || 0) +
    Number(sessionRevenue._sum.payment_amount || 0);

  return {
    total: totalRevenue,
    subscriptions: {
      amount: Number(subscriptionRevenue._sum.amount || 0),
      count: subscriptionRevenue._count,
    },
    services: {
      amount: Number(serviceRevenue._sum.total_amount || 0),
      count: serviceRevenue._count,
    },
    sessions: {
      amount: Number(sessionRevenue._sum.payment_amount || 0),
      count: sessionRevenue._count,
    },
    timeRange,
  };
};

/**
 * Get revenue trends over time (daily/weekly/monthly)
 */
export const getRevenueTrends = async (
  timeRange: string = "30d",
  groupBy: "day" | "week" | "month" = "day"
) => {
  const { startDate } = getDateRange(timeRange);

  // Get subscription payments grouped by date
  const subscriptionTrends = await prisma.$queryRaw<
    Array<{ date: Date; amount: number }>
  >`
    SELECT 
      DATE(payment_date) as date,
      SUM(amount) as amount
    FROM payments
    WHERE payment_status = 'completed'
      AND payment_date >= ${startDate}
    GROUP BY DATE(payment_date)
    ORDER BY date ASC
  `;

  // Get service booking payments grouped by date
  const serviceTrends = await prisma.$queryRaw<
    Array<{ date: Date; amount: number }>
  >`
    SELECT 
      DATE(created_at) as date,
      SUM(total_amount) as amount
    FROM service_bookings
    WHERE payment_status = 'completed'
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  // Get session enrollment payments grouped by date
  const sessionTrends = await prisma.$queryRaw<
    Array<{ date: Date; amount: number }>
  >`
    SELECT 
      DATE(enrollment_date) as date,
      SUM(payment_amount) as amount
    FROM session_enrollments
    WHERE payment_status = 'completed'
      AND enrollment_date >= ${startDate}
    GROUP BY DATE(enrollment_date)
    ORDER BY date ASC
  `;

  // Combine and aggregate by date
  const trendsMap = new Map<string, any>();

  subscriptionTrends.forEach((item) => {
    const dateKey = item.date.toISOString().split("T")[0];
    if (!trendsMap.has(dateKey)) {
      trendsMap.set(dateKey, {
        date: dateKey,
        subscriptions: 0,
        services: 0,
        sessions: 0,
        total: 0,
      });
    }
    const existing = trendsMap.get(dateKey);
    existing.subscriptions += Number(item.amount);
    existing.total += Number(item.amount);
  });

  serviceTrends.forEach((item) => {
    const dateKey = item.date.toISOString().split("T")[0];
    if (!trendsMap.has(dateKey)) {
      trendsMap.set(dateKey, {
        date: dateKey,
        subscriptions: 0,
        services: 0,
        sessions: 0,
        total: 0,
      });
    }
    const existing = trendsMap.get(dateKey);
    existing.services += Number(item.amount);
    existing.total += Number(item.amount);
  });

  sessionTrends.forEach((item) => {
    const dateKey = item.date.toISOString().split("T")[0];
    if (!trendsMap.has(dateKey)) {
      trendsMap.set(dateKey, {
        date: dateKey,
        subscriptions: 0,
        services: 0,
        sessions: 0,
        total: 0,
      });
    }
    const existing = trendsMap.get(dateKey);
    existing.sessions += Number(item.amount);
    existing.total += Number(item.amount);
  });

  return Array.from(trendsMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Get payment method distribution
 */
export const getPaymentMethodStats = async (timeRange: string = "30d") => {
  const { startDate } = getDateRange(timeRange);

  const subscriptionMethods = await prisma.payments.groupBy({
    by: ["payment_method"],
    where: {
      payment_status: "completed",
      payment_date: { gte: startDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  const serviceMethods = await prisma.service_bookings.groupBy({
    by: ["payment_method"],
    where: {
      payment_status: "completed",
      created_at: { gte: startDate },
    },
    _sum: { total_amount: true },
    _count: true,
  });

  const sessionMethods = await prisma.session_enrollments.groupBy({
    by: ["payment_method"],
    where: {
      payment_status: "completed",
      enrollment_date: { gte: startDate },
    },
    _sum: { payment_amount: true },
    _count: true,
  });

  // Combine all methods
  const methodsMap = new Map<string, any>();

  subscriptionMethods.forEach((item) => {
    const method = item.payment_method || "Unknown";
    if (!methodsMap.has(method)) {
      methodsMap.set(method, { method, amount: 0, count: 0 });
    }
    const existing = methodsMap.get(method);
    existing.amount += Number(item._sum.amount || 0);
    existing.count += item._count;
  });

  serviceMethods.forEach((item) => {
    const method = item.payment_method || "Unknown";
    if (!methodsMap.has(method)) {
      methodsMap.set(method, { method, amount: 0, count: 0 });
    }
    const existing = methodsMap.get(method);
    existing.amount += Number(item._sum.total_amount || 0);
    existing.count += item._count;
  });

  sessionMethods.forEach((item) => {
    const method = item.payment_method || "Unknown";
    if (!methodsMap.has(method)) {
      methodsMap.set(method, { method, amount: 0, count: 0 });
    }
    const existing = methodsMap.get(method);
    existing.amount += Number(item._sum.payment_amount || 0);
    existing.count += item._count;
  });

  return Array.from(methodsMap.values()).sort((a, b) => b.amount - a.amount);
};

/**
 * Get top revenue-generating users
 */
export const getTopRevenueUsers = async (
  limit: number = 10,
  timeRange: string = "30d"
) => {
  const { startDate } = getDateRange(timeRange);

  const topUsers = await prisma.$queryRaw<
    Array<{
      user_id: number;
      first_name: string;
      last_name: string;
      email: string;
      total_spent: number;
      transaction_count: number;
    }>
  >`
    SELECT 
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      COALESCE(sub_total, 0) + COALESCE(service_total, 0) + COALESCE(session_total, 0) as total_spent,
      COALESCE(sub_count, 0) + COALESCE(service_count, 0) + COALESCE(session_count, 0) as transaction_count
    FROM users u
    LEFT JOIN (
      SELECT user_id, SUM(amount) as sub_total, COUNT(*) as sub_count
      FROM payments
      WHERE payment_status = 'completed' AND payment_date >= ${startDate}
      GROUP BY user_id
    ) subs ON u.id = subs.user_id
    LEFT JOIN (
      SELECT user_id, SUM(total_amount) as service_total, COUNT(*) as service_count
      FROM service_bookings
      WHERE payment_status = 'completed' AND created_at >= ${startDate}
      GROUP BY user_id
    ) services ON u.id = services.user_id
    LEFT JOIN (
      SELECT user_id, SUM(payment_amount) as session_total, COUNT(*) as session_count
      FROM session_enrollments
      WHERE payment_status = 'completed' AND enrollment_date >= ${startDate}
      GROUP BY user_id
    ) sessions ON u.id = sessions.user_id
    WHERE COALESCE(sub_total, 0) + COALESCE(service_total, 0) + COALESCE(session_total, 0) > 0
    ORDER BY total_spent DESC
    LIMIT ${limit}
  `;

  return topUsers.map((user) => ({
    user_id: user.user_id,
    name: `${user.first_name} ${user.last_name}`,
    email: user.email,
    total_spent: Number(user.total_spent),
    transaction_count: Number(user.transaction_count),
  }));
};

/**
 * Get subscription analytics
 */
export const getSubscriptionAnalytics = async (timeRange: string = "30d") => {
  const { startDate } = getDateRange(timeRange);

  const [totalActive, recentPayments, byPlan] = await Promise.all([
    // Active subscriptions count
    prisma.subscriptions.count({
      where: { status: "active" },
    }),

    // Recent subscription payments
    prisma.payments.aggregate({
      where: {
        payment_status: "completed",
        payment_date: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
      _avg: { amount: true },
    }),

    // By subscription plan
    prisma.subscriptions.groupBy({
      by: ["plan_type"],
      where: {
        status: "active",
      },
      _count: true,
    }),
  ]);

  return {
    activeSubscriptions: totalActive,
    revenueInPeriod: Number(recentPayments._sum.amount || 0),
    transactionCount: recentPayments._count,
    averageValue: Number(recentPayments._avg.amount || 0),
    byPlan: byPlan.map((plan) => ({
      plan: plan.plan_type,
      count: plan._count,
    })),
  };
};

/**
 * Get service booking analytics
 */
export const getServiceBookingAnalytics = async (timeRange: string = "30d") => {
  const { startDate } = getDateRange(timeRange);

  const [recentBookings, topServices] = await Promise.all([
    // Recent booking stats
    prisma.service_bookings.aggregate({
      where: {
        payment_status: "completed",
        created_at: { gte: startDate },
      },
      _sum: { total_amount: true },
      _count: true,
      _avg: { total_amount: true },
    }),

    // Top revenue-generating services
    prisma.$queryRaw<
      Array<{
        service_id: number;
        title: string;
        total_revenue: number;
        booking_count: number;
      }>
    >`
      SELECT 
        s.id as service_id,
        s.title,
        SUM(sb.total_amount) as total_revenue,
        COUNT(sb.id) as booking_count
      FROM services s
      INNER JOIN service_bookings sb ON s.id = sb.service_id
      WHERE sb.payment_status = 'completed' AND sb.created_at >= ${startDate}
      GROUP BY s.id, s.title
      ORDER BY total_revenue DESC
      LIMIT 10
    `,
  ]);

  return {
    revenueInPeriod: Number(recentBookings._sum.total_amount || 0),
    bookingCount: recentBookings._count,
    averageValue: Number(recentBookings._avg.total_amount || 0),
    topServices: topServices.map((service) => ({
      service_id: service.service_id,
      title: service.title,
      revenue: Number(service.total_revenue),
      bookings: Number(service.booking_count),
    })),
  };
};

/**
 * Get session enrollment analytics
 */
export const getSessionEnrollmentAnalytics = async (
  timeRange: string = "30d"
) => {
  const { startDate } = getDateRange(timeRange);

  const [recentEnrollments, topSessions] = await Promise.all([
    // Recent enrollment stats
    prisma.session_enrollments.aggregate({
      where: {
        payment_status: "completed",
        enrollment_date: { gte: startDate },
      },
      _sum: { payment_amount: true },
      _count: true,
      _avg: { payment_amount: true },
    }),

    // Top revenue-generating sessions
    prisma.$queryRaw<
      Array<{
        session_id: number;
        title: string;
        total_revenue: number;
        enrollment_count: number;
      }>
    >`
      SELECT 
        s.id as session_id,
        s.title,
        SUM(se.payment_amount) as total_revenue,
        COUNT(se.id) as enrollment_count
      FROM sessions s
      INNER JOIN session_enrollments se ON s.id = se.session_id
      WHERE se.payment_status = 'completed' AND se.enrollment_date >= ${startDate}
      GROUP BY s.id, s.title
      ORDER BY total_revenue DESC
      LIMIT 10
    `,
  ]);

  return {
    revenueInPeriod: Number(recentEnrollments._sum.payment_amount || 0),
    enrollmentCount: recentEnrollments._count,
    averageValue: Number(recentEnrollments._avg.payment_amount || 0),
    topSessions: topSessions.map((session) => ({
      session_id: session.session_id,
      title: session.title,
      revenue: Number(session.total_revenue),
      enrollments: Number(session.enrollment_count),
    })),
  };
};

/**
 * Get monthly recurring revenue (MRR) trends
 */
export const getMRRTrends = async (months: number = 12) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Get MRR from actual payments grouped by month
  const mrrData = await prisma.$queryRaw<
    Array<{ month: string; total_revenue: number; payment_count: number }>
  >`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') as month,
      COUNT(*) as payment_count,
      SUM(amount) as total_revenue
    FROM payments
    WHERE payment_status = 'completed' 
      AND payment_date >= ${startDate}
    GROUP BY month
    ORDER BY month ASC
  `;

  // Get subscription counts per month
  const subCounts = await prisma.$queryRaw<
    Array<{ month: string; new_subs: number; active_subs: number }>
  >`
    SELECT 
      TO_CHAR(DATE_TRUNC('month', start_date), 'YYYY-MM') as month,
      COUNT(*) as new_subs,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subs
    FROM subscriptions
    WHERE start_date >= ${startDate}
    GROUP BY month
    ORDER BY month ASC
  `;

  // Combine the data
  const monthMap = new Map<string, any>();
  
  mrrData.forEach((item) => {
    monthMap.set(item.month, {
      month: item.month,
      mrr: Number(item.total_revenue || 0),
      new_subscribers: 0,
      churned_subscribers: 0,
    });
  });

  subCounts.forEach((item) => {
    const existing = monthMap.get(item.month) || {
      month: item.month,
      mrr: 0,
      new_subscribers: 0,
      churned_subscribers: 0,
    };
    existing.new_subscribers = Number(item.new_subs || 0);
    monthMap.set(item.month, existing);
  });

  return Array.from(monthMap.values()).sort((a, b) => 
    a.month.localeCompare(b.month)
  );
};

/**
 * Get payment status distribution
 */
export const getPaymentStatusDistribution = async (
  timeRange: string = "30d"
) => {
  const { startDate } = getDateRange(timeRange);

  const [subscriptionStatus, serviceStatus, sessionStatus] = await Promise.all([
    prisma.payments.groupBy({
      by: ["payment_status"],
      where: {
        payment_date: { gte: startDate },
      },
      _count: true,
      _sum: { amount: true },
    }),

    prisma.service_bookings.groupBy({
      by: ["payment_status"],
      where: {
        created_at: { gte: startDate },
      },
      _count: true,
      _sum: { total_amount: true },
    }),

    prisma.session_enrollments.groupBy({
      by: ["payment_status"],
      where: {
        enrollment_date: { gte: startDate },
      },
      _count: true,
      _sum: { payment_amount: true },
    }),
  ]);

  const statusMap = new Map<string, any>();

  subscriptionStatus.forEach((item) => {
    const status = item.payment_status || "unknown";
    if (!statusMap.has(status)) {
      statusMap.set(status, { status, count: 0, amount: 0 });
    }
    const existing = statusMap.get(status);
    existing.count += item._count;
    existing.amount += Number(item._sum.amount || 0);
  });

  serviceStatus.forEach((item) => {
    const status = item.payment_status || "unknown";
    if (!statusMap.has(status)) {
      statusMap.set(status, { status, count: 0, amount: 0 });
    }
    const existing = statusMap.get(status);
    existing.count += item._count;
    existing.amount += Number(item._sum.total_amount || 0);
  });

  sessionStatus.forEach((item) => {
    const status = item.payment_status || "unknown";
    if (!statusMap.has(status)) {
      statusMap.set(status, { status, count: 0, amount: 0 });
    }
    const existing = statusMap.get(status);
    existing.count += item._count;
    existing.amount += Number(item._sum.payment_amount || 0);
  });

  return Array.from(statusMap.values());
};

/**
 * Get comprehensive finance dashboard data
 */
export const getFinanceDashboard = async (timeRange: string = "30d") => {
  const [
    overview,
    subscriptionAnalytics,
    serviceAnalytics,
    sessionAnalytics,
    paymentMethods,
    paymentStatus,
  ] = await Promise.all([
    getRevenueOverview(timeRange),
    getSubscriptionAnalytics(timeRange),
    getServiceBookingAnalytics(timeRange),
    getSessionEnrollmentAnalytics(timeRange),
    getPaymentMethodStats(timeRange),
    getPaymentStatusDistribution(timeRange),
  ]);

  return {
    overview,
    subscriptions: subscriptionAnalytics,
    services: serviceAnalytics,
    sessions: sessionAnalytics,
    paymentMethods,
    paymentStatus,
    timeRange,
  };
};

/**
 * Helper function to get date range
 */
function getDateRange(timeRange: string) {
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

  return { startDate, endDate: now };
}
