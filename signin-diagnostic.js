#!/usr/bin/env node

/**
 * Sign-in Diagnostic Tool
 * Identifies why you cannot sign in
 */

const axios = require('axios');
require('dotenv').config();

async function diagnoseSigInIssues() {
  console.log('🔍 SIGN-IN DIAGNOSTIC TOOL');
  console.log('==========================\n');
  
  // Check 1: Environment variables
  console.log('1. Checking environment configuration...');
  const apiKey = process.env.FIREBASE_API_KEY;
  const dbUser = process.env.DB_USER;
  const dbName = process.env.DB_NAME;
  
  console.log(`   Firebase API Key: ${apiKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Database User: ${dbUser ? '✅ Present' : '❌ Missing'}`);
  console.log(`   Database Name: ${dbName ? '✅ Present' : '❌ Missing'}`);
  
  if (!apiKey) {
    console.log('\n❌ CRITICAL: Firebase API Key is missing!');
    console.log('   Add this to your .env file:');
    console.log('   FIREBASE_API_KEY=AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M');
    return;
  }
  
  // Check 2: Firebase API connectivity
  console.log('\n2. Testing Firebase API connectivity...');
  try {
    const testResponse = await axios.get(`https://identitytoolkit.googleapis.com/v1/projects/stellarion-b76d6?key=${apiKey}`);
    console.log('   ✅ Firebase API is accessible');
  } catch (error) {
    console.log('   ❌ Firebase API connection failed');
    console.log('   Error:', error.response?.data?.error?.message || error.message);
  }
  
  // Check 3: Test user credentials
  console.log('\n3. Testing common user credentials...');
  
  const commonCredentials = [
    { email: 'learner@gmail.com', password: 'learner', role: 'Test Learner' },
    { email: 'admin@gmail.com', password: 'admin', role: 'Test Admin' },
    { email: 'guide@gmail.com', password: 'guide', role: 'Test Guide' },
    { email: 'abeywickramairumi@gmail.com', password: 'password123', role: 'User Account' }
  ];
  
  let workingCredentials = [];
  
  for (const creds of commonCredentials) {
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
      
      console.log(`   ✅ ${creds.email} - Sign-in successful!`);
      workingCredentials.push(creds);
      
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const errorCode = error.response.data.error.message;
        switch(errorCode) {
          case 'EMAIL_NOT_FOUND':
            console.log(`   ❌ ${creds.email} - User does not exist`);
            break;
          case 'INVALID_PASSWORD':
            console.log(`   ❌ ${creds.email} - Wrong password`);
            break;
          case 'USER_DISABLED':
            console.log(`   ❌ ${creds.email} - User account disabled`);
            break;
          default:
            console.log(`   ❌ ${creds.email} - ${errorCode}`);
        }
      } else {
        console.log(`   ❌ ${creds.email} - Network error`);
      }
    }
  }
  
  // Check 4: Backend server status
  console.log('\n4. Testing backend server...');
  try {
    const healthResponse = await axios.get('http://localhost:5000/health');
    console.log('   ✅ Backend server is running');
  } catch (error) {
    console.log('   ❌ Backend server is not running');
    console.log('   Start it with: npm run dev');
  }
  
  // Check 5: Frontend status
  console.log('\n5. Testing frontend server...');
  try {
    const frontendResponse = await axios.get('http://localhost:5174');
    console.log('   ✅ Frontend server is running');
  } catch (error) {
    console.log('   ❌ Frontend server is not running');
    console.log('   Start it with: npm run dev (in front-end/frontend folder)');
  }
  
  // Summary and recommendations
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  if (workingCredentials.length > 0) {
    console.log('✅ GOOD NEWS: Some accounts are working!');
    console.log('   Working credentials:');
    workingCredentials.forEach(creds => {
      console.log(`   - ${creds.email} / ${creds.password}`);
    });
    console.log('\n💡 Try signing in with these credentials in your frontend app.');
  } else {
    console.log('❌ NO WORKING CREDENTIALS FOUND');
    console.log('\n🔧 SOLUTIONS:');
    console.log('1. Create test users by running:');
    console.log('   node scripts/create-firebase-users.js');
    console.log('');
    console.log('2. Or manually create a user in Firebase Console:');
    console.log('   - Go to: https://console.firebase.google.com/project/stellarion-b76d6/authentication/users');
    console.log('   - Click "Add user"');
    console.log('   - Enter email and password');
    console.log('');
    console.log('3. If users exist but passwords are wrong, reset them in Firebase Console');
  }
  
  console.log('\n🌐 FRONTEND TESTING:');
  console.log('1. Open: http://localhost:5174');
  console.log('2. Go to the login page');
  console.log('3. Try the working credentials listed above');
  console.log('4. Check browser console for any JavaScript errors');
  
  console.log('\n🔧 BACKEND TESTING:');
  console.log('1. Make sure backend is running: npm run dev');
  console.log('2. Test the auth endpoint: POST http://localhost:5000/api/auth/signin');
  console.log('3. Check server logs for authentication errors');
}

diagnoseSigInIssues().catch(error => {
  console.error('\n❌ Diagnostic failed:', error.message);
  console.log('\nThis might indicate a more serious configuration issue.');
  console.log('Check your Firebase project settings and API key.');
});
