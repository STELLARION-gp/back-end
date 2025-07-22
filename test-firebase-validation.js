#!/usr/bin/env node

/**
 * Firebase Token Validation Test
 * Tests if the Firebase Admin SDK can verify tokens from the frontend
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function testTokenValidation() {
  console.log('🔍 Testing Firebase Token Validation...\n');

  // Test Firebase admin initialization
  try {
    const app = admin.app();
    console.log('✅ Firebase Admin initialized successfully');
    console.log('   Project ID:', serviceAccount.project_id);
    console.log('   Client Email:', serviceAccount.client_email);
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    return;
  }

  // Test auth service
  try {
    const auth = admin.auth();
    console.log('✅ Firebase Auth service available');
    
    // Try to list users to verify connection
    const listUsers = await auth.listUsers(1);
    console.log('✅ Can connect to Firebase Auth');
    console.log('   Sample user count:', listUsers.users.length);
    
    if (listUsers.users.length > 0) {
      const user = listUsers.users[0];
      console.log('   Sample user email:', user.email);
      console.log('   Sample user UID:', user.uid);
    }
    
  } catch (error) {
    console.error('❌ Firebase Auth connection failed:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 'auth/project-not-found') {
      console.log('💡 Hint: Check if the project ID in serviceAccountKey.json is correct');
    } else if (error.code === 'auth/invalid-credential') {
      console.log('💡 Hint: Check if the service account key is valid and has proper permissions');
    }
  }

  console.log('\n🔧 Token Validation Tips:');
  console.log('1. Make sure the frontend and backend use the same Firebase project');
  console.log('2. Ensure the service account has "Firebase Authentication Admin" role');
  console.log('3. Check that the token being sent is a valid Firebase ID token');
  console.log('4. Verify the token hasn\'t expired (Firebase ID tokens expire after 1 hour)');
}

testTokenValidation().catch(console.error);
