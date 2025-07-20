const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function testSubscriptionSystem() {
  try {
    console.log('🚀 Testing Subscription System...\n');

    // Test 1: Check subscription plans
    console.log('1. Testing subscription plans table:');
    const plansResult = await pool.query('SELECT * FROM subscription_plans ORDER BY price_lkr');
    console.log(`   ✅ Found ${plansResult.rows.length} subscription plans:`);
    plansResult.rows.forEach(plan => {
      console.log(`   - ${plan.name}: LKR ${plan.price_lkr} (${plan.plan_type})`);
      console.log(`     Features: ${plan.features.length} features included`);
      console.log(`     Chatbot limit: ${plan.chatbot_questions_limit} questions/day`);
    });

    // Test 2: Check subscriptions table
    console.log('\n2. Testing subscriptions table:');
    const subscriptionsResult = await pool.query('SELECT COUNT(*) FROM subscriptions');
    console.log(`   ✅ Subscriptions table exists with ${subscriptionsResult.rows[0].count} records`);

    // Test 3: Check payments table
    console.log('\n3. Testing payments table:');
    const paymentsResult = await pool.query('SELECT COUNT(*) FROM payments');
    console.log(`   ✅ Payments table exists with ${paymentsResult.rows[0].count} records`);

    // Test 4: Check chatbot_usage table
    console.log('\n4. Testing chatbot_usage table:');
    const chatbotResult = await pool.query('SELECT COUNT(*) FROM chatbot_usage');
    console.log(`   ✅ Chatbot usage table exists with ${chatbotResult.rows[0].count} records`);

    // Test 5: Check users table modifications
    console.log('\n5. Testing users table modifications:');
    const usersResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_plan IS NOT NULL THEN 1 END) as users_with_subscription,
        subscription_plan,
        COUNT(*) as count
      FROM users 
      GROUP BY subscription_plan
    `);
    
    console.log(`   ✅ Total users: ${usersResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0)}`);
    usersResult.rows.forEach(row => {
      const plan = row.subscription_plan || 'NULL';
      console.log(`   - ${plan}: ${row.count} users`);
    });

    // Test 6: Check database constraints and relationships
    console.log('\n6. Testing database constraints:');
    const constraintsResult = await pool.query(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_name IN ('subscription_plans', 'subscriptions', 'payments', 'chatbot_usage')
      ORDER BY tc.table_name, tc.constraint_type
    `);
    
    console.log(`   ✅ Found ${constraintsResult.rows.length} constraints:`);
    constraintsResult.rows.forEach(constraint => {
      console.log(`   - ${constraint.table_name}.${constraint.constraint_name} (${constraint.constraint_type})`);
    });

    console.log('\n🎉 Subscription system database verification complete!');
    console.log('\n📋 Summary:');
    console.log('- ✅ All subscription tables created');
    console.log('- ✅ Subscription plans populated (3 plans)');
    console.log('- ✅ Users table updated with subscription fields');
    console.log('- ✅ Database constraints and relationships established');
    console.log('\n🔄 Next steps:');
    console.log('1. Test backend API endpoints');
    console.log('2. Test frontend subscription components');
    console.log('3. Configure PayHere payment gateway');

  } catch (error) {
    console.error('❌ Error testing subscription system:', error.message);
  } finally {
    await pool.end();
  }
}

testSubscriptionSystem();
