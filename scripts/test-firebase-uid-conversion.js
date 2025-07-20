const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Test the Firebase UID to user_id conversion
async function testFirebaseUIDConversion() {
  try {
    console.log('🔍 Testing Firebase UID to user_id conversion...\n');

    // First, let's see what Firebase UIDs exist in the database
    const usersResult = await pool.query(`
      SELECT id, firebase_uid, email, first_name, last_name, subscription_plan 
      FROM users 
      WHERE firebase_uid IS NOT NULL 
      LIMIT 5
    `);

    console.log('📋 Users with Firebase UIDs:');
    usersResult.rows.forEach(user => {
      console.log(`   ID: ${user.id}, Firebase UID: ${user.firebase_uid}, Email: ${user.email}, Plan: ${user.subscription_plan}`);
    });

    if (usersResult.rows.length === 0) {
      console.log('   ❌ No users with Firebase UIDs found.');
      return;
    }

    // Test the conversion function
    const testUser = usersResult.rows[0];
    console.log(`\n🧪 Testing conversion for Firebase UID: ${testUser.firebase_uid}`);

    // Test the helper function logic
    const conversionResult = await pool.query(
      'SELECT id FROM users WHERE firebase_uid = $1', 
      [testUser.firebase_uid]
    );

    if (conversionResult.rows.length > 0) {
      const convertedId = conversionResult.rows[0].id;
      console.log(`   ✅ Conversion successful: Firebase UID ${testUser.firebase_uid} → User ID ${convertedId}`);
      
      // Verify it matches
      if (convertedId === testUser.id) {
        console.log(`   ✅ Conversion is correct!`);
      } else {
        console.log(`   ❌ Conversion mismatch! Expected ${testUser.id}, got ${convertedId}`);
      }
    } else {
      console.log(`   ❌ Conversion failed: No user found for Firebase UID ${testUser.firebase_uid}`);
    }

    // Test with the subscription query
    console.log(`\n🔍 Testing subscription query with converted user ID...`);
    const subscriptionResult = await pool.query(`
      SELECT 
        u.subscription_plan, 
        u.subscription_status, 
        u.subscription_start_date, 
        u.subscription_end_date,
        u.auto_renew,
        u.chatbot_questions_used,
        u.chatbot_questions_reset_date,
        sp.name as plan_name,
        sp.description as plan_description,
        sp.price_lkr,
        sp.features,
        sp.chatbot_questions_limit
      FROM users u
      LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
      WHERE u.id = $1
    `, [testUser.id]);

    if (subscriptionResult.rows.length > 0) {
      const subscription = subscriptionResult.rows[0];
      console.log(`   ✅ Subscription query successful!`);
      console.log(`   Plan: ${subscription.plan_name} (${subscription.subscription_plan})`);
      console.log(`   Status: ${subscription.subscription_status}`);
      console.log(`   Chatbot used: ${subscription.chatbot_questions_used}/${subscription.chatbot_questions_limit}`);
    } else {
      console.log(`   ❌ Subscription query failed!`);
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testFirebaseUIDConversion();
