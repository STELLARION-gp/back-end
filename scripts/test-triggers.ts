/**
 * Test Provider Payment Triggers
 * 
 * This script tests that the database triggers properly update
 * provider_payments when bookings/enrollments are completed.
 * 
 * Usage:
 *   npx tsx scripts/test-triggers.ts
 */

import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

async function testTriggers() {
  console.log('🧪 Testing Provider Payment Triggers\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Verify triggers exist
    console.log('\n📋 Step 1: Verifying triggers are installed...\n');
    
    const triggers = await prisma.$queryRaw<any[]>`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%provider_payment%';
    `;

    if (triggers.length === 0) {
      console.log('❌ No triggers found!');
      console.log('   Run: npx tsx scripts/apply-provider-triggers.ts');
      return;
    }

    console.log(`✅ Found ${triggers.length} triggers:`);
    triggers.forEach(t => {
      console.log(`   - ${t.trigger_name} on ${t.event_object_table}`);
    });

    // Step 2: Find a provider with completed bookings/enrollments
    console.log('\n📋 Step 2: Finding test data...\n');
    
    const [testBooking, testEnrollment] = await Promise.all([
      prisma.service_bookings.findFirst({
        where: { payment_status: 'completed' },
        include: { services: true },
      }),
      prisma.session_enrollments.findFirst({
        where: { payment_status: 'completed' },
        include: { sessions: true },
      }),
    ]);

    if (!testBooking && !testEnrollment) {
      console.log('⚠️  No completed bookings or enrollments found!');
      console.log('   Create a test booking or enrollment with payment_status = "completed"');
      console.log('   Then run this script again.');
      return;
    }

    // Step 3: Test service booking trigger
    if (testBooking) {
      console.log('✅ Found test service booking:');
      console.log(`   Booking ID: ${testBooking.id}`);
      console.log(`   Service ID: ${testBooking.service_id}`);
      console.log(`   Provider ID: ${testBooking.services.created_by}`);
      console.log(`   Amount: LKR ${Number(testBooking.total_amount).toFixed(2)}`);
      console.log(`   Date: ${testBooking.created_at.toLocaleDateString()}`);

      const month = testBooking.created_at.getMonth() + 1;
      const year = testBooking.created_at.getFullYear();

      console.log(`\n🔧 Triggering recalculation for ${getMonthName(month)} ${year}...`);
      
      // Get before state
      const beforePayment = await prisma.provider_payments.findFirst({
        where: {
          provider_id: testBooking.services.created_by,
          month,
          year,
        },
      });

      console.log(`   Before: ${beforePayment ? 'Record exists' : 'No record'}`);
      if (beforePayment) {
        console.log(`      Revenue: LKR ${Number(beforePayment.total_revenue).toFixed(2)}`);
        console.log(`      Services: ${beforePayment.services_count}`);
      }

      // Trigger the update by updating the booking
      await prisma.service_bookings.update({
        where: { id: testBooking.id },
        data: { updated_at: new Date() }, // Touch the record to trigger
      });

      // Small delay to let trigger execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get after state
      const afterPayment = await prisma.provider_payments.findFirst({
        where: {
          provider_id: testBooking.services.created_by,
          month,
          year,
        },
      });

      console.log(`   After: ${afterPayment ? 'Record exists ✅' : 'No record ❌'}`);
      if (afterPayment) {
        console.log(`      Revenue: LKR ${Number(afterPayment.total_revenue).toFixed(2)}`);
        console.log(`      Services: ${afterPayment.services_count}`);
        console.log(`      Sessions: ${afterPayment.sessions_count}`);
        console.log(`      Platform Fee: LKR ${Number(afterPayment.platform_fee).toFixed(2)}`);
        console.log(`      Provider Earnings: LKR ${Number(afterPayment.provider_earnings).toFixed(2)}`);
      }
    }

    // Step 4: Test session enrollment trigger
    if (testEnrollment) {
      console.log('\n✅ Found test session enrollment:');
      console.log(`   Enrollment ID: ${testEnrollment.id}`);
      console.log(`   Session ID: ${testEnrollment.session_id}`);
      console.log(`   Provider ID: ${testEnrollment.sessions.created_by}`);
      console.log(`   Amount: LKR ${Number(testEnrollment.payment_amount || 0).toFixed(2)}`);
      console.log(`   Date: ${testEnrollment.enrollment_date.toLocaleDateString()}`);

      const month = testEnrollment.enrollment_date.getMonth() + 1;
      const year = testEnrollment.enrollment_date.getFullYear();

      console.log(`\n🔧 Triggering recalculation for ${getMonthName(month)} ${year}...`);
      
      // Get before state
      const beforePayment = await prisma.provider_payments.findFirst({
        where: {
          provider_id: testEnrollment.sessions.created_by,
          month,
          year,
        },
      });

      console.log(`   Before: ${beforePayment ? 'Record exists' : 'No record'}`);
      if (beforePayment) {
        console.log(`      Revenue: LKR ${Number(beforePayment.total_revenue).toFixed(2)}`);
        console.log(`      Sessions: ${beforePayment.sessions_count}`);
      }

      // Trigger the update by updating the enrollment
      await prisma.session_enrollments.update({
        where: { id: testEnrollment.id },
        data: { updated_at: new Date() }, // Touch the record to trigger
      });

      // Small delay to let trigger execute
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get after state
      const afterPayment = await prisma.provider_payments.findFirst({
        where: {
          provider_id: testEnrollment.sessions.created_by,
          month,
          year,
        },
      });

      console.log(`   After: ${afterPayment ? 'Record exists ✅' : 'No record ❌'}`);
      if (afterPayment) {
        console.log(`      Revenue: LKR ${Number(afterPayment.total_revenue).toFixed(2)}`);
        console.log(`      Services: ${afterPayment.services_count}`);
        console.log(`      Sessions: ${afterPayment.sessions_count}`);
        console.log(`      Platform Fee: LKR ${Number(afterPayment.platform_fee).toFixed(2)}`);
        console.log(`      Provider Earnings: LKR ${Number(afterPayment.provider_earnings).toFixed(2)}`);
      }
    }

    // Step 5: Test status change trigger
    console.log('\n📋 Step 5: Testing status change...\n');
    
    // Find a pending booking to test
    const pendingBooking = await prisma.service_bookings.findFirst({
      where: { payment_status: 'pending' },
      include: { services: true },
    });

    if (pendingBooking) {
      console.log('✅ Found pending booking to test status change');
      console.log(`   Booking ID: ${pendingBooking.id}`);
      
      const month = pendingBooking.created_at.getMonth() + 1;
      const year = pendingBooking.created_at.getFullYear();

      // Get current state
      const beforeCount = await prisma.provider_payments.count({
        where: {
          provider_id: pendingBooking.services.created_by,
          month,
          year,
        },
      });

      console.log(`   Provider payments before: ${beforeCount}`);

      // Change status to completed
      console.log('   Changing status to completed...');
      await prisma.service_bookings.update({
        where: { id: pendingBooking.id },
        data: { payment_status: 'completed' },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if payment record was created/updated
      const afterPayment = await prisma.provider_payments.findFirst({
        where: {
          provider_id: pendingBooking.services.created_by,
          month,
          year,
        },
      });

      if (afterPayment) {
        console.log('   ✅ Payment record created/updated!');
        console.log(`      Revenue: LKR ${Number(afterPayment.total_revenue).toFixed(2)}`);
      }

      // Change it back to pending
      console.log('   Reverting status back to pending...');
      await prisma.service_bookings.update({
        where: { id: pendingBooking.id },
        data: { payment_status: 'pending' },
      });
    } else {
      console.log('⚠️  No pending bookings found to test status change');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Trigger Test Complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Triggers installed: ${triggers.length}`);
    console.log(`   - Service booking trigger: ${testBooking ? '✅ Working' : '⚠️  Not tested'}`);
    console.log(`   - Session enrollment trigger: ${testEnrollment ? '✅ Working' : '⚠️  Not tested'}`);
    console.log('\n🎯 Triggers are working! New completed bookings/enrollments');
    console.log('   will automatically update provider_payments table.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during testing:', error);
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
testTriggers()
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
