/**
 * Backfill Provider Payments Script
 * 
 * This script populates the provider_payments table with historical data
 * by analyzing all completed service_bookings and session_enrollments.
 * 
 * Usage:
 * Run from back-end directory:
 * npx tsx scripts/backfill-provider-payments.ts
 * 
 * Options:
 * --start-date YYYY-MM - Start from this month (default: earliest booking)
 * --end-date YYYY-MM - End at this month (default: current month)
 * --dry-run - Preview changes without saving to database
 */

import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

interface MonthYear {
  month: number;
  year: number;
}

interface ProviderRevenue {
  provider_id: number;
  provider_name: string;
  provider_email: string;
  provider_type: string;
  services_revenue: number;
  services_count: number;
  sessions_revenue: number;
  sessions_count: number;
  total_revenue: number;
  platform_fee: number;
  provider_earnings: number;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    startDate: null as MonthYear | null,
    endDate: null as MonthYear | null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start-date' && args[i + 1]) {
      const [year, month] = args[i + 1].split('-').map(Number);
      config.startDate = { month, year };
      i++;
    } else if (args[i] === '--end-date' && args[i + 1]) {
      const [year, month] = args[i + 1].split('-').map(Number);
      config.endDate = { month, year };
      i++;
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    }
  }

  return config;
}

/**
 * Get all months between start and end date
 */
function getMonthsBetween(start: MonthYear, end: MonthYear): MonthYear[] {
  const months: MonthYear[] = [];
  let current = { ...start };

  while (
    current.year < end.year ||
    (current.year === end.year && current.month <= end.month)
  ) {
    months.push({ ...current });
    current.month++;
    if (current.month > 12) {
      current.month = 1;
      current.year++;
    }
  }

  return months;
}

/**
 * Get the earliest booking/enrollment date
 */
async function getEarliestDate(): Promise<MonthYear> {
  const [earliestBooking, earliestEnrollment] = await Promise.all([
    prisma.service_bookings.findFirst({
      where: { payment_status: 'completed' },
      orderBy: { created_at: 'asc' },
      select: { created_at: true },
    }),
    prisma.session_enrollments.findFirst({
      where: { payment_status: 'completed' },
      orderBy: { enrollment_date: 'asc' },
      select: { enrollment_date: true },
    }),
  ]);

  const dates = [
    earliestBooking?.created_at,
    earliestEnrollment?.enrollment_date,
  ].filter(Boolean) as Date[];

  if (dates.length === 0) {
    // No data found, use current month
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  return { month: earliest.getMonth() + 1, year: earliest.getFullYear() };
}

/**
 * Calculate provider revenue for a specific month/year
 */
async function calculateProviderRevenue(
  providerId: number,
  month: number,
  year: number
): Promise<ProviderRevenue | null> {
  // Get provider details
  const provider = await prisma.users.findUnique({
    where: { id: providerId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      role: true,
    },
  });

  if (!provider) {
    return null;
  }

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Get service bookings revenue
  const serviceRevenue = await prisma.service_bookings.aggregate({
    where: {
      services: {
        created_by: providerId,
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

  // Get session enrollments revenue
  const sessionRevenue = await prisma.session_enrollments.aggregate({
    where: {
      sessions: {
        created_by: providerId,
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

  // Only return if there's revenue
  if (totalRevenue === 0) {
    return null;
  }

  const platformFee = totalRevenue * 0.1; // 10% platform fee
  const providerEarnings = totalRevenue * 0.9; // 90% to provider

  return {
    provider_id: provider.id,
    provider_name: `${provider.first_name} ${provider.last_name}`,
    provider_email: provider.email,
    provider_type: provider.role as string,
    services_revenue: servicesAmount,
    services_count: serviceRevenue._count,
    sessions_revenue: sessionsAmount,
    sessions_count: sessionRevenue._count,
    total_revenue: totalRevenue,
    platform_fee: platformFee,
    provider_earnings: providerEarnings,
  };
}

/**
 * Process a single month for all providers
 */
async function processMonth(
  month: number,
  year: number,
  dryRun: boolean
): Promise<{ created: number; updated: number; skipped: number }> {
  console.log(`\n📅 Processing ${getMonthName(month)} ${year}...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Get all providers (guides and influencers)
  const providers = await prisma.users.findMany({
    where: {
      OR: [{ role: 'guide' }, { role: 'influencer' }],
      is_active: true,
    },
    select: { id: true },
  });

  console.log(`   Found ${providers.length} active providers`);

  for (const provider of providers) {
    const revenue = await calculateProviderRevenue(provider.id, month, year);

    if (!revenue) {
      skipped++;
      continue;
    }

    console.log(
      `   💰 ${revenue.provider_name}: LKR ${revenue.total_revenue.toFixed(2)} ` +
      `(Services: ${revenue.services_count}, Sessions: ${revenue.sessions_count})`
    );

    if (dryRun) {
      console.log(`   [DRY RUN] Would create/update payment record`);
      created++;
      continue;
    }

    // Check if payment record exists
    const existing = await prisma.provider_payments.findFirst({
      where: {
        provider_id: revenue.provider_id,
        month,
        year,
      },
    });

    if (existing) {
      // Update existing record
      await prisma.provider_payments.update({
        where: { id: existing.id },
        data: {
          total_revenue: revenue.total_revenue,
          platform_fee: revenue.platform_fee,
          provider_earnings: revenue.provider_earnings,
          services_revenue: revenue.services_revenue,
          services_count: revenue.services_count,
          sessions_revenue: revenue.sessions_revenue,
          sessions_count: revenue.sessions_count,
          provider_name: revenue.provider_name,
          provider_email: revenue.provider_email,
          provider_type: revenue.provider_type,
          updated_at: new Date(),
        },
      });
      updated++;
      console.log(`   ✅ Updated existing payment record`);
    } else {
      // Create new record
      await prisma.provider_payments.create({
        data: {
          provider_id: revenue.provider_id,
          provider_name: revenue.provider_name,
          provider_email: revenue.provider_email,
          provider_type: revenue.provider_type,
          month,
          year,
          total_revenue: revenue.total_revenue,
          platform_fee: revenue.platform_fee,
          provider_earnings: revenue.provider_earnings,
          services_revenue: revenue.services_revenue,
          services_count: revenue.services_count,
          sessions_revenue: revenue.sessions_revenue,
          sessions_count: revenue.sessions_count,
          payment_status: 'pending',
        },
      });
      created++;
      console.log(`   ✅ Created new payment record`);
    }
  }

  console.log(
    `   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`
  );

  return { created, updated, skipped };
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Provider Payments Backfill Script\n');
  console.log('=' .repeat(60));

  const config = parseArgs();

  if (config.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
  }

  // Determine date range
  const startDate = config.startDate || (await getEarliestDate());
  const currentDate = new Date();
  const endDate = config.endDate || {
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
  };

  console.log(`📅 Date Range:`);
  console.log(`   Start: ${getMonthName(startDate.month)} ${startDate.year}`);
  console.log(`   End: ${getMonthName(endDate.month)} ${endDate.year}\n`);

  // Get all months to process
  const months = getMonthsBetween(startDate, endDate);
  console.log(`📋 Total months to process: ${months.length}\n`);
  console.log('=' .repeat(60));

  // Process each month
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const { month, year } of months) {
    const result = await processMonth(month, year, config.dryRun);
    totalCreated += result.created;
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
  }

  // Print final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ Backfill Complete!\n');
  console.log('📊 Final Summary:');
  console.log(`   ✨ Records Created: ${totalCreated}`);
  console.log(`   🔄 Records Updated: ${totalUpdated}`);
  console.log(`   ⏭️  Providers Skipped (no revenue): ${totalSkipped}`);
  console.log(`   📦 Total Records Processed: ${totalCreated + totalUpdated}`);
  console.log('=' .repeat(60));

  if (config.dryRun) {
    console.log('\n⚠️  This was a DRY RUN - no changes were saved to the database');
    console.log('Run without --dry-run to apply changes\n');
  }
}

/**
 * Helper function to get month name
 */
function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1];
}

// Execute the script
main()
  .then(() => {
    console.log('✅ Script completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error executing script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
