// scripts/create-firebase-test-token.js
require('dotenv').config();

async function createFirebaseTestToken() {
  console.log('🔥 Creating Firebase Test Token');
  console.log('='.repeat(50));

  try {
    const admin = require('firebase-admin');
    
    // Check if Firebase is already initialized
    if (!admin.apps.length) {
      console.log('❌ Firebase Admin not initialized');
      console.log('   This script requires Firebase Admin SDK to be set up');
      return;
    }

    // Create a custom token for testing
    const testUserId = 'test-user-' + Date.now();
    const customClaims = {
      email: 'test@example.com',
      role: 'learner',
      plan: 'galaxy_explorer'
    };

    console.log('🔧 Creating custom token for user:', testUserId);
    const customToken = await admin.auth().createCustomToken(testUserId, customClaims);
    
    console.log('✅ Custom Token Created:');
    console.log(customToken);
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('This is a CUSTOM token, not an ID token!');
    console.log('To use it for API testing:');
    console.log('1. Exchange it for an ID token using Firebase Client SDK');
    console.log('2. Or use it to sign in on the frontend first');
    
    console.log('\n📝 To create a test user with ID token:');
    console.log('1. Use this custom token to sign in via Firebase Client SDK');
    console.log('2. Call user.getIdToken() to get the ID token');
    console.log('3. Use the ID token for API requests');

    // Try to create a user in the database for testing
    const { Pool } = require('pg');
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: parseInt(process.env.DB_PORT || "5432"),
    });

    try {
      const result = await pool.query(`
        INSERT INTO users (firebase_uid, email, display_name, role, subscription_plan)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (firebase_uid) DO NOTHING
        RETURNING *
      `, [testUserId, 'test@example.com', 'Test User', 'learner', 'galaxy_explorer']);

      if (result.rows.length > 0) {
        console.log('\n✅ Test user created in database:');
        console.log('   Firebase UID:', testUserId);
        console.log('   Email:', 'test@example.com');
        console.log('   Role:', 'learner');
      } else {
        console.log('\n✅ Test user already exists in database');
      }
    } catch (dbError) {
      console.log('\n⚠️  Could not create test user in database:', dbError.message);
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Error creating Firebase token:', error.message);
    
    if (error.message.includes('Firebase')) {
      console.log('\n🔧 Firebase Setup Issues:');
      console.log('1. Ensure serviceAccountKey.json is valid');
      console.log('2. Check Firebase project configuration');
      console.log('3. Verify Firebase Admin SDK initialization');
    }
  }

  console.log('\n' + '='.repeat(50));
}

createFirebaseTestToken().catch(console.error);
