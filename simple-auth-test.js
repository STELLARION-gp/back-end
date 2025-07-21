#!/usr/bin/env node

/**
 * Simple Authentication Test
 * Tests basic Firebase admin setup and sign-in functionality
 */

const admin = require('firebase-admin');
const axios = require('axios');
require('dotenv').config();

// Initialize Firebase Admin with explicit error handling
try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  }
  
  console.log('✅ Firebase Admin initialized successfully');
  console.log('   Project ID:', serviceAccount.project_id);
  console.log('   Client Email:', serviceAccount.client_email);
  
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

async function testAuthentication() {
  console.log('\n🔍 Testing Authentication...\n');
  
  // Test 1: Check Firebase API Key
  const apiKey = process.env.FIREBASE_API_KEY;
  console.log('1. Firebase API Key:', apiKey ? '✅ Found' : '❌ Missing');
  
  if (!apiKey) {
    console.log('   Add FIREBASE_API_KEY to your .env file');
    return;
  }
  
  // Test 2: Try to list users (verify admin access)
  try {
    const listUsers = await admin.auth().listUsers(1);
    console.log('2. Firebase Admin Access: ✅ Working');
    console.log('   Found', listUsers.users.length, 'user(s)');
  } catch (error) {
    console.log('2. Firebase Admin Access: ❌ Failed');
    console.log('   Error:', error.message);
    return;
  }
  
  // Test 3: Try sign-in with a test user
  const testEmail = 'learner@gmail.com';
  const testPassword = 'learner';
  
  console.log('\n3. Testing sign-in with test user...');
  console.log('   Email:', testEmail);
  console.log('   Password:', testPassword);
  
  try {
    const signInResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: testEmail,
        password: testPassword,
        returnSecureToken: true
      }
    );
    
    console.log('   ✅ Sign-in successful!');
    console.log('   User ID:', signInResponse.data.localId);
    console.log('   ID Token length:', signInResponse.data.idToken.length);
    
    // Test 4: Verify the token with admin
    try {
      const decodedToken = await admin.auth().verifyIdToken(signInResponse.data.idToken);
      console.log('4. Token verification: ✅ Valid');
      console.log('   UID:', decodedToken.uid);
      console.log('   Email:', decodedToken.email);
    } catch (error) {
      console.log('4. Token verification: ❌ Failed');
      console.log('   Error:', error.message);
    }
    
  } catch (error) {
    console.log('   ❌ Sign-in failed');
    
    if (error.response && error.response.data && error.response.data.error) {
      const errorCode = error.response.data.error.message;
      console.log('   Error code:', errorCode);
      
      switch(errorCode) {
        case 'EMAIL_NOT_FOUND':
          console.log('   💡 User does not exist. Create test users first.');
          break;
        case 'INVALID_PASSWORD':
          console.log('   💡 Wrong password for the test user.');
          break;
        case 'INVALID_EMAIL':
          console.log('   💡 Invalid email format.');
          break;
        default:
          console.log('   💡 Unknown error:', errorCode);
      }
    } else {
      console.log('   Error:', error.message);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('If sign-in failed, try:');
  console.log('1. Run: node scripts/create-firebase-users.js');
  console.log('2. Check Firebase Console for user creation');
  console.log('3. Verify your .env file has FIREBASE_API_KEY');
  console.log('4. Make sure the frontend uses the same Firebase project');
}

testAuthentication().catch(console.error);
