// test-auth-fix.js
// Quick test to verify the authentication fix

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stellarion',
  password: 'admin123',
  port: 5432,
});

// Helper function to get database user ID from Firebase UID
const getUserIdFromFirebaseUid = async (firebaseUid) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [firebaseUid]);
      return result.rows.length > 0 ? result.rows[0].id : null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting user ID from Firebase UID:', error);
    return null;
  }
};

// Test the function
async function testAuthFix() {
  console.log('🧪 Testing authentication fix...');
  
  try {
    // Test with existing test user
    const testFirebaseUid = 'learner-firebase-uid';
    console.log(`🔍 Looking up user with Firebase UID: ${testFirebaseUid}`);
    
    const userId = await getUserIdFromFirebaseUid(testFirebaseUid);
    
    if (userId) {
      console.log(`✅ Success! Database user ID: ${userId}`);
      
      // Test guide application lookup
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT application_id, first_name, last_name, email 
          FROM guide_application 
          WHERE user_id = $1 AND deletion_status = FALSE
        `, [userId]);
        
        console.log(`📋 Found ${result.rows.length} guide applications for this user`);
        if (result.rows.length > 0) {
          console.log('📄 Sample application:', result.rows[0]);
        }
      } finally {
        client.release();
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testAuthFix();
