// services/providerPayments.service.ts
import { prisma } from "../lib/prisma";

/**
 * Interface for provider payment record
 */
export interface ProviderPayment {
  id: number;
  provider_id: number;
  provider_name: string;
  provider_email: string;
  provider_type: 'guide' | 'influencer';
  month: number;
  year: number;
  total_revenue: number;
  platform_fee: number;
  provider_earnings: number;
  services_revenue: number;
  services_count: number;
  sessions_revenue: number;
  sessions_count: number;
  payment_status: string;
  payment_method: string | null;
  transaction_id: string | null;
  payment_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get all provider payments with filters
 */
export const getProviderPayments = async (filters?: {
  status?: string;
  provider_type?: 'guide' | 'influencer';
  month?: number;
  year?: number;
  search?: string;
}) => {
  try {
    // Build WHERE clause
    const where: any = {};

    if (filters?.status) {
      where.payment_status = filters.status;
    }

    if (filters?.month) {
      where.month = filters.month;
    }

    if (filters?.year) {
      where.year = filters.year;
    }

    // Get provider payments with user details
    let payments = await prisma.provider_payments.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { created_at: 'desc' },
      ],
    });

    // Filter by provider_type if specified
    if (filters?.provider_type) {
      payments = payments.filter(
        (p) => p.provider.role === filters.provider_type
      );
    }

    // Filter by search term if specified
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      payments = payments.filter((p) => {
        const providerName = `${p.provider.first_name} ${p.provider.last_name}`.toLowerCase();
        const providerEmail = p.provider.email.toLowerCase();
        const transactionId = p.transaction_id?.toLowerCase() || '';
        
        return (
          providerName.includes(searchLower) ||
          providerEmail.includes(searchLower) ||
          transactionId.includes(searchLower)
        );
      });
    }

    // Format the response
    return payments.map((payment) => ({
      id: payment.id,
      provider_id: payment.provider_id,
      provider_name: `${payment.provider.first_name} ${payment.provider.last_name}`,
      provider_email: payment.provider.email,
      provider_type: payment.provider.role as 'guide' | 'influencer',
      month: payment.month,
      year: payment.year,
      total_revenue: Number(payment.total_revenue),
      platform_fee: Number(payment.platform_fee),
      provider_earnings: Number(payment.provider_earnings),
      services_revenue: Number(payment.services_revenue || 0),
      services_count: payment.services_count || 0,
      sessions_revenue: Number(payment.sessions_revenue || 0),
      sessions_count: payment.sessions_count || 0,
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching provider payments:', error);
    throw error;
  }
};

/**
 * Get payment details by ID
 */
export const getPaymentById = async (id: number) => {
  try {
    const payment = await prisma.provider_payments.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true,
            profile_data: true,
          },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      id: payment.id,
      provider_id: payment.provider_id,
      provider_name: `${payment.provider.first_name} ${payment.provider.last_name}`,
      provider_email: payment.provider.email,
      provider_type: payment.provider.role as 'guide' | 'influencer',
      month: payment.month,
      year: payment.year,
      total_revenue: Number(payment.total_revenue),
      platform_fee: Number(payment.platform_fee),
      provider_earnings: Number(payment.provider_earnings),
      services_revenue: Number(payment.services_revenue || 0),
      services_count: payment.services_count || 0,
      sessions_revenue: Number(payment.sessions_revenue || 0),
      sessions_count: payment.sessions_count || 0,
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date,
      notes: payment.notes,
      created_at: payment.created_at,
      updated_at: payment.updated_at,
    };
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  id: number,
  status: string,
  data?: {
    payment_method?: string;
    transaction_id?: string;
    notes?: string;
  }
) => {
  try {
    const updateData: any = {
      payment_status: status,
      updated_at: new Date(),
    };

    // If marking as paid, add payment date and transaction ID
    if (status === 'paid') {
      updateData.payment_date = new Date();
      if (!data?.transaction_id) {
        // Generate transaction ID if not provided
        updateData.transaction_id = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }
    }

    if (data?.payment_method) {
      updateData.payment_method = data.payment_method;
    }

    if (data?.transaction_id) {
      updateData.transaction_id = data.transaction_id;
    }

    if (data?.notes) {
      updateData.notes = data.notes;
    }

    const payment = await prisma.provider_payments.update({
      where: { id },
      data: updateData,
      include: {
        provider: {
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

    return {
      id: payment.id,
      provider_id: payment.provider_id,
      provider_name: `${payment.provider.first_name} ${payment.provider.last_name}`,
      provider_email: payment.provider.email,
      provider_type: payment.provider.role as 'guide' | 'influencer',
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date,
      notes: payment.notes,
      updated_at: payment.updated_at,
    };
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
};

/**
 * Generate provider payments for a specific month/year
 * This aggregates revenue from service_bookings and session_enrollments
 */
export const generateProviderPayments = async (month: number, year: number) => {
  try {
    // Validate month and year
    if (month < 1 || month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
    if (year < 2020) {
      throw new Error('Invalid year');
    }

    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all guides and influencers
    const providers = await prisma.users.findMany({
      where: {
        OR: [
          { role: 'guide' },
          { role: 'influencer' },
        ],
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
      },
    });

    const generatedPayments = [];

    // For each provider, calculate their revenue
    for (const provider of providers) {
      // Get service bookings revenue (for guides)
      const serviceRevenue = await prisma.service_bookings.aggregate({
        where: {
          services: {
            created_by: provider.id,
          },
          payment_status: 'completed',
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { total_amount: true },
        _count: true,
      });

      // Get session enrollments revenue (for influencers)
      const sessionRevenue = await prisma.session_enrollments.aggregate({
        where: {
          sessions: {
            created_by: provider.id,
          },
          payment_status: 'completed',
          enrollment_date: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { payment_amount: true },
        _count: true,
      });

      const servicesAmount = Number(serviceRevenue._sum.total_amount || 0);
      const sessionsAmount = Number(sessionRevenue._sum.payment_amount || 0);
      const totalRevenue = servicesAmount + sessionsAmount;

      // Only create payment record if there's revenue
      if (totalRevenue > 0) {
        const platformFee = totalRevenue * 0.1; // 10% platform fee
        const providerEarnings = totalRevenue * 0.9; // 90% to provider

        // Check if payment already exists
        const existing = await prisma.provider_payments.findFirst({
          where: {
            provider_id: provider.id,
            month,
            year,
          },
        });

        if (existing) {
          // Update existing payment
          await prisma.provider_payments.update({
            where: { id: existing.id },
            data: {
              total_revenue: totalRevenue,
              platform_fee: platformFee,
              provider_earnings: providerEarnings,
              services_revenue: servicesAmount,
              services_count: serviceRevenue._count,
              sessions_revenue: sessionsAmount,
              sessions_count: sessionRevenue._count,
              updated_at: new Date(),
            },
          });
        } else {
          // Create new payment record
          const payment = await prisma.provider_payments.create({
            data: {
              provider_id: provider.id,
              provider_name: `${provider.first_name} ${provider.last_name}`,
              provider_email: provider.email,
              provider_type: provider.role as string,
              month,
              year,
              total_revenue: totalRevenue,
              platform_fee: platformFee,
              provider_earnings: providerEarnings,
              services_revenue: servicesAmount,
              services_count: serviceRevenue._count,
              sessions_revenue: sessionsAmount,
              sessions_count: sessionRevenue._count,
              payment_status: 'pending',
            },
          });

          generatedPayments.push(payment);
        }
      }
    }

    return {
      month,
      year,
      generated: generatedPayments.length,
      message: `Generated ${generatedPayments.length} payment records for ${getMonthName(month)} ${year}`,
    };
  } catch (error) {
    console.error('Error generating provider payments:', error);
    throw error;
  }
};

/**
 * Export provider payments as CSV data
 */
export const exportPayments = async (filters?: {
  status?: string;
  provider_type?: 'guide' | 'influencer';
  month?: number;
  year?: number;
}) => {
  try {
    const payments = await getProviderPayments(filters);

    // Convert to CSV format
    const headers = [
      'ID',
      'Provider Name',
      'Provider Email',
      'Type',
      'Month',
      'Year',
      'Services Revenue',
      'Sessions Revenue',
      'Total Revenue',
      'Platform Fee',
      'Provider Earnings',
      'Status',
      'Payment Method',
      'Transaction ID',
      'Payment Date',
      'Created At',
    ];

    const rows = payments.map((payment) => [
      payment.id,
      payment.provider_name,
      payment.provider_email,
      payment.provider_type,
      payment.month,
      payment.year,
      payment.services_revenue.toFixed(2),
      payment.sessions_revenue.toFixed(2),
      payment.total_revenue.toFixed(2),
      payment.platform_fee.toFixed(2),
      payment.provider_earnings.toFixed(2),
      payment.payment_status,
      payment.payment_method || '',
      payment.transaction_id || '',
      payment.payment_date ? payment.payment_date.toISOString() : '',
      payment.created_at.toISOString(),
    ]);

    return {
      headers,
      rows,
      payments,
    };
  } catch (error) {
    console.error('Error exporting payments:', error);
    throw error;
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async () => {
  try {
    const [totalPending, totalPaid, activeProviders, currentMonthTotal] = await Promise.all([
      // Total pending amount
      prisma.provider_payments.aggregate({
        where: { payment_status: 'pending' },
        _sum: { provider_earnings: true },
        _count: true,
      }),

      // Total paid this month
      prisma.provider_payments.aggregate({
        where: {
          payment_status: 'paid',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
        _sum: { provider_earnings: true },
        _count: true,
      }),

      // Count of active providers
      prisma.users.count({
        where: {
          OR: [{ role: 'guide' }, { role: 'influencer' }],
          is_active: true,
        },
      }),

      // Current month total
      prisma.provider_payments.aggregate({
        where: {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
        _sum: { provider_earnings: true },
        _count: true,
      }),
    ]);

    return {
      pending_amount: Number(totalPending._sum.provider_earnings || 0),
      pending_count: totalPending._count,
      paid_this_month: Number(totalPaid._sum.provider_earnings || 0),
      paid_count_this_month: totalPaid._count,
      active_providers: activeProviders,
      current_month_total: Number(currentMonthTotal._sum.provider_earnings || 0),
      current_month_count: currentMonthTotal._count,
    };
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw error;
  }
};

/**
 * Helper function to get month name
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}
