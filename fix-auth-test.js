#!/usr/bin/env node

/**
 * Fixed Authentication Test with proper credential handling
 */

const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeFirebaseAdmin() {
  try {
    // Read service account key as raw JSON
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
    const serviceAccountRaw = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountRaw);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }
    
    console.log('✅ Firebase Admin initialized successfully');
    console.log('   Project ID:', serviceAccount.project_id);
    console.log('   Client Email:', serviceAccount.client_email.substring(0, 30) + '...');
    
    return serviceAccount;
    
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

async function testBasicAuth() {
  console.log('\n🔍 Testing Basic Authentication Setup...\n');
  
  try {
    // Initialize Firebase Admin
    const serviceAccount = await initializeFirebaseAdmin();
    
    // Test 1: Check Firebase API Key
    const apiKey = process.env.FIREBASE_API_KEY;
    console.log('1. Firebase API Key:', apiKey ? '✅ Found' : '❌ Missing');
    
    if (!apiKey) {
      console.log('   💡 Add FIREBASE_API_KEY=AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M to .env');
      return;
    }
    
    // Test 2: Check Firebase Admin Auth Service
    console.log('2. Testing Firebase Admin Auth...');
    const auth = admin.auth();
    
    // Try to list users (this will test admin access)
    try {
      const listResult = await auth.listUsers(3);
      console.log('   ✅ Firebase Admin working');
      console.log('   Found', listResult.users.length, 'users');
      
      if (listResult.users.length > 0) {
        console.log('   Sample users:');
        listResult.users.forEach(user => {
          console.log(`     - ${user.email} (${user.uid.substring(0, 10)}...)`);
        });
      }
    } catch (error) {
      console.log('   ❌ Firebase Admin failed:', error.message);
      throw error;
    }
    
    // Test 3: Try Firebase Auth REST API
    console.log('\n3. Testing Firebase Auth REST API...');
    
    // Try with a known test user
    const testCredentials = [
      { email: 'learner@gmail.com', password: 'learner' },
      { email: 'admin@gmail.com', password: 'admin' },
      { email: 'guide@gmail.com', password: 'guide' }
    ];
    
    let signInSuccess = false;
    
    for (const creds of testCredentials) {
      try {
        console.log(`   Trying ${creds.email}...`);
        
        const response = await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            email: creds.email,
            password: creds.password,
            returnSecureToken: true
          }
        );
        
        console.log(`   ✅ Sign-in successful with ${creds.email}!`);
        console.log(`   User ID: ${response.data.localId}`);
        
        // Verify token with admin
        try {
          const decodedToken = await admin.auth().verifyIdToken(response.data.idToken);
          console.log(`   ✅ Token verification successful`);
          console.log(`   UID: ${decodedToken.uid}`);
          console.log(`   Email: ${decodedToken.email}`);
          signInSuccess = true;
          break;
        } catch (verifyError) {
          console.log(`   ❌ Token verification failed: ${verifyError.message}`);
        }
        
      } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
          const errorCode = error.response.data.error.message;
          console.log(`   ❌ ${creds.email}: ${errorCode}`);
        } else {
          console.log(`   ❌ ${creds.email}: ${error.message}`);
        }
      }
    }
    
    if (!signInSuccess) {
      console.log('\n💡 No test users found. Creating them...');
      await createTestUsers();
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n📋 Troubleshooting Steps:');
    console.log('1. Check if serviceAccountKey.json is valid');
    console.log('2. Verify Firebase project settings');
    console.log('3. Ensure service account has proper permissions');
    console.log('4. Check if Firebase project is active');
  }
}

async function createTestUsers() {
  console.log('\n🔧 Creating test users...');
  
  const testUsers = [
    { uid: 'learner-test', email: 'learner@gmail.com', password: 'learner', displayName: 'Test Learner' },
    { uid: 'admin-test', email: 'admin@gmail.com', password: 'admin', displayName: 'Test Admin' },
    { uid: 'guide-test', email: 'guide@gmail.com', password: 'guide', displayName: 'Test Guide' }
  ];
  
  for (const userData of testUsers) {
    try {
      // Check if user exists
      try {
        await admin.auth().getUser(userData.uid);
        console.log(`   ✅ ${userData.email} already exists`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create the user
          await admin.auth().createUser({
            uid: userData.uid,
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
            emailVerified: true
          });
          console.log(`   ✅ Created ${userData.email}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to create ${userData.email}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Test user creation completed!');
  console.log('You can now try signing in with:');
  console.log('- learner@gmail.com / learner');
  console.log('- admin@gmail.com / admin');
  console.log('- guide@gmail.com / guide');
}

testBasicAuth().catch(console.error);
