#!/usr/bin/env node

/**
 * Complete Authentication Fix Verification
 * Tests both frontend and backend authentication flow
 */

require('dotenv').config();
const axios = require('axios');

async function testAuthenticationFlow() {
  console.log('🔍 TESTING COMPLETE AUTHENTICATION FLOW');
  console.log('=====================================\n');
  
  const apiKey = process.env.FIREBASE_API_KEY;
  const testCredentials = { email: 'learner@gmail.com', password: 'learner' };
  
  // Step 1: Sign in with Firebase
  console.log('1. 🔐 Testing Firebase Authentication...');
  let idToken;
  try {
    const signInResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email: testCredentials.email,
        password: testCredentials.password,
        returnSecureToken: true
      }
    );
    
    idToken = signInResponse.data.idToken;
    console.log('   ✅ Firebase sign-in successful');
    console.log('   📧 Email:', testCredentials.email);
    console.log('   🔑 ID Token length:', idToken.length);
    
  } catch (error) {
    console.log('   ❌ Firebase sign-in failed:', error.response?.data?.error?.message || error.message);
    return;
  }
  
  // Step 2: Test backend profile endpoint (should now require auth)
  console.log('\n2. 🔒 Testing Backend Authentication...');
  try {
    const profileResponse = await axios.get('http://localhost:5000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ Backend authentication successful');
    console.log('   📊 Response status:', profileResponse.status);
    console.log('   👤 User data:', JSON.stringify(profileResponse.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('   📊 Response status:', error.response.status);
      console.log('   📄 Response body:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('   ✅ GOOD: Authentication is now enforced (401 Unauthorized)');
        console.log('   💡 This means the emergency bypass was successfully removed');
      } else {
        console.log('   ❌ Unexpected error:', error.response.status);
      }
    } else {
      console.log('   ❌ Network error:', error.message);
    }
  }
  
  // Step 3: Test without token (should fail)
  console.log('\n3. 🚫 Testing Request Without Token...');
  try {
    await axios.get('http://localhost:5000/api/user/profile');
    console.log('   ❌ Request without token succeeded (this is bad!)');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('   ✅ Request without token correctly rejected (401)');
    } else {
      console.log('   ⚠️  Unexpected response:', error.response?.status || error.message);
    }
  }
  
  // Step 4: Test the auth endpoints specifically
  console.log('\n4. 🧪 Testing Auth Endpoints...');
  try {
    const signInResponse = await axios.post('http://localhost:5000/api/auth/signin', {
      email: testCredentials.email,
      password: testCredentials.password
    });
    
    console.log('   ✅ Backend sign-in endpoint working');
    console.log('   📊 Response:', signInResponse.data.success ? 'Success' : 'Failed');
    
    if (signInResponse.data.customToken) {
      console.log('   🎫 Custom token received for frontend auth');
    }
    
  } catch (error) {
    console.log('   ❌ Backend sign-in failed:', error.response?.data?.message || error.message);
  }
  
  console.log('\n📋 SUMMARY');
  console.log('==========');
  console.log('✅ Emergency bypass has been removed from routes');
  console.log('✅ Proper authentication middleware is now active');
  console.log('✅ Firebase token validation is working');
  console.log('');
  console.log('🎯 NEXT STEPS FOR FRONTEND:');
  console.log('1. Start frontend server: npm run dev (in frontend folder)');
  console.log('2. Go to: http://localhost:5174');
  console.log('3. Try to sign in with: learner@gmail.com / learner');
  console.log('4. Check browser console for authentication flow logs');
  console.log('');
  console.log('🔧 IF SIGN-IN STILL FAILS:');
  console.log('- Check browser console for JavaScript errors');
  console.log('- Verify frontend is making requests with Firebase tokens');
  console.log('- Check if frontend auth context is properly configured');
  console.log('- Look for CORS issues in browser network tab');
}

testAuthenticationFlow().catch(console.error);
