#!/usr/bin/env node

/**
 * Test original passwords for existing users
 */

require('dotenv').config();
const axios = require('axios');

async function testOriginalPasswords() {
  console.log('🔐 TESTING ORIGINAL PASSWORDS');
  console.log('============================\n');
  
  const apiKey = process.env.FIREBASE_API_KEY;
  
  const credentialVariations = [
    // Original simple passwords
    { email: 'admin@gmail.com', password: 'admin' },
    { email: 'guide@gmail.com', password: 'guide' },
    { email: 'mentor@gmail.com', password: 'mentor' },
    { email: 'influencer@gmail.com', password: 'influencer' },
    
    // Password with 123 suffix
    { email: 'admin@gmail.com', password: 'admin123' },
    { email: 'guide@gmail.com', password: 'guide123' },
    { email: 'mentor@gmail.com', password: 'mentor123' },
    { email: 'influencer@gmail.com', password: 'influencer123' },
    
    // Common variations
    { email: 'admin@gmail.com', password: 'password' },
    { email: 'admin@gmail.com', password: 'password123' },
    { email: 'admin@gmail.com', password: 'test123' }
  ];
  
  let workingCredentials = [
    { email: 'learner@gmail.com', password: 'learner', status: 'Confirmed working' }
  ];
  
  for (const creds of credentialVariations) {
    try {
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          email: creds.email,
          password: creds.password,
          returnSecureToken: true
        }
      );
      
      console.log(`✅ ${creds.email} / ${creds.password} - SUCCESS!`);
      workingCredentials.push({
        email: creds.email,
        password: creds.password,
        status: 'Working'
      });
      
    } catch (error) {
      // Only show first attempt for each email to reduce noise
      const isFirstAttempt = !workingCredentials.some(wc => wc.email === creds.email && wc.status === 'Working');
      if (isFirstAttempt && error.response && error.response.data && error.response.data.error) {
        const errorCode = error.response.data.error.message;
        if (errorCode === 'INVALID_PASSWORD') {
          console.log(`❌ ${creds.email} / ${creds.password} - Wrong password`);
        } else if (errorCode !== 'INVALID_LOGIN_CREDENTIALS') {
          console.log(`❌ ${creds.email} / ${creds.password} - ${errorCode}`);
        }
      }
    }
  }
  
  console.log('\n🎉 FINAL WORKING CREDENTIALS:');
  console.log('============================');
  
  // Remove duplicates and show unique working credentials
  const uniqueWorking = workingCredentials.filter((cred, index, arr) => 
    arr.findIndex(c => c.email === cred.email) === index
  );
  
  uniqueWorking.forEach(cred => {
    console.log(`✅ ${cred.email} / ${cred.password}`);
  });
  
  if (uniqueWorking.length === 1) {
    console.log('\n💡 Only one working account found. Let\'s create a simple admin account:');
    
    try {
      // Create a simple admin account
      const newAdminResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          email: 'admin@test.com',
          password: 'admin123',
          displayName: 'Test Admin',
          returnSecureToken: true
        }
      );
      
      console.log('✅ Created: admin@test.com / admin123');
      uniqueWorking.push({ email: 'admin@test.com', password: 'admin123', status: 'New account' });
      
    } catch (createError) {
      console.log('ℹ️  Could not create additional admin account');
    }
  }
  
  console.log('\n🚀 READY TO SIGN IN!');
  console.log('==================');
  console.log('1. Start frontend: npm run dev (in frontend folder)');
  console.log('2. Go to: http://localhost:5174');
  console.log('3. Use any of the working credentials above');
  console.log('');
  console.log('🔧 If sign-in still fails, check:');
  console.log('- Browser console for JavaScript errors');
  console.log('- Network tab for failed API requests');
  console.log('- Backend logs for authentication errors');
}

testOriginalPasswords().catch(console.error);
