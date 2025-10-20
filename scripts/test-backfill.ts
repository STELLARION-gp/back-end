/**
 * Quick Test Script for Provider Payments Backfill
 * 
 * This script tests the backfill functionality with a small date range
 * to verify everything is working correctly before running full backfill.
 * 
 * Usage: npx tsx scripts/test-backfill.ts
 */

import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function testBackfill() {
  console.log('🧪 Testing Provider Payments Backfill\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Check for completed transactions
    console.log('\n📊 Step 1: Checking for completed transactions...');
    
    const [completedBookings, completedEnrollments] = await Promise.all([
      prisma.service_bookings.count({
        where: { payment_status: 'completed' },
      }),
      prisma.session_enrollments.count({
        where: { payment_status: 'completed' },
      }),
    ]);

    console.log(`   ✅ Found ${completedBookings} completed service bookings`);
    console.log(`   ✅ Found ${completedEnrollments} completed session enrollments`);

    if (completedBookings === 0 && completedEnrollments === 0) {
      console.log('\n   ⚠️  No completed transactions found!');
      console.log('   Create some test bookings/enrollments with payment_status = "completed"');
      return;
    }

    // Step 2: Check for active providers
    console.log('\n📊 Step 2: Checking for active providers...');
    
    const providers = await prisma.users.findMany({
      where: {
        OR: [{ role: 'guide' }, { role: 'influencer' }],
        is_active: true,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role: true,
      },
    });

    console.log(`   ✅ Found ${providers.length} active providers:`);
    providers.forEach((p) => {
      console.log(`      - ${p.first_name} ${p.last_name} (${p.role})`);
    });

    if (providers.length === 0) {
      console.log('\n   ⚠️  No active providers found!');
      console.log('   Ensure users have role = "guide" or "influencer" and is_active = true');
      return;
    }

    // Step 3: Check earliest transaction date
    console.log('\n📊 Step 3: Finding earliest transaction date...');
    
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

    if (dates.length > 0) {
      const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
      console.log(`   ✅ Earliest transaction: ${earliest.toLocaleDateString()}`);
    }

    // Step 4: Test with current month
    console.log('\n📊 Step 4: Testing backfill for current month...');
    
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log(`   Processing ${getMonthName(currentMonth)} ${currentYear}...`);

    // Calculate revenue for one provider as test
    if (providers.length > 0) {
      const testProvider = providers[0];
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

      const [serviceRevenue, sessionRevenue] = await Promise.all([
        prisma.service_bookings.aggregate({
          where: {
            services: { created_by: testProvider.id },
            payment_status: 'completed',
            created_at: { gte: startDate, lte: endDate },
          },
          _sum: { total_amount: true },
          _count: true,
        }),
        prisma.session_enrollments.aggregate({
          where: {
            sessions: { created_by: testProvider.id },
            payment_status: 'completed',
            enrollment_date: { gte: startDate, lte: endDate },
          },
          _sum: { payment_amount: true },
          _count: true,
        }),
      ]);

      const servicesAmount = Number(serviceRevenue._sum.total_amount || 0);
      const sessionsAmount = Number(sessionRevenue._sum.payment_amount || 0);
      const totalRevenue = servicesAmount + sessionsAmount;

      console.log(`   Test Provider: ${testProvider.first_name} ${testProvider.last_name}`);
      console.log(`      Services: ${serviceRevenue._count} bookings = LKR ${servicesAmount.toFixed(2)}`);
      console.log(`      Sessions: ${sessionRevenue._count} enrollments = LKR ${sessionsAmount.toFixed(2)}`);
      console.log(`      Total Revenue: LKR ${totalRevenue.toFixed(2)}`);

      if (totalRevenue > 0) {
        const platformFee = totalRevenue * 0.1;
        const providerEarnings = totalRevenue * 0.9;
        console.log(`      Platform Fee (10%): LKR ${platformFee.toFixed(2)}`);
        console.log(`      Provider Earnings (90%): LKR ${providerEarnings.toFixed(2)}`);
      } else {
        console.log(`      ⚠️  No revenue for this provider in current month`);
      }
    }

    // Step 5: Check existing payment records
    console.log('\n📊 Step 5: Checking existing payment records...');
    
    const existingPayments = await prisma.provider_payments.count();
    console.log(`   ✅ Found ${existingPayments} existing payment records`);

    if (existingPayments > 0) {
      const sample = await prisma.provider_payments.findFirst({
        orderBy: { created_at: 'desc' },
      });
      if (sample) {
        console.log(`   Latest record: ${sample.provider_name} - ${getMonthName(sample.month)} ${sample.year}`);
        console.log(`   Status: ${sample.payment_status}, Revenue: LKR ${Number(sample.total_revenue).toFixed(2)}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Complete!\n');
    console.log('Summary:');
    console.log(`   - Completed Bookings: ${completedBookings}`);
    console.log(`   - Completed Enrollments: ${completedEnrollments}`);
    console.log(`   - Active Providers: ${providers.length}`);
    console.log(`   - Existing Payment Records: ${existingPayments}`);
    console.log('\nReady to run backfill:');
    console.log('   API: POST /api/provider-payments/backfill');
    console.log('   CLI: npx ts-node scripts/backfill-provider-payments.ts --dry-run');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    throw error;
  }
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1];
}

// Run the test
testBackfill()
  .then(() => {
    console.log('\n✅ Test completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
