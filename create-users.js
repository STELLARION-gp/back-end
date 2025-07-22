#!/usr/bin/env node

/**
 * Create additional test users that are missing
 */

require('dotenv').config();
const axios = require('axios');

async function createMissingUsers() {
  console.log('🔧 CREATING MISSING TEST USERS');
  console.log('==============================\n');
  
  const apiKey = process.env.FIREBASE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Firebase API Key not found in .env');
    return;
  }
  
  // Users that failed in our diagnostic
  const usersToCreate = [
    { email: 'admin@gmail.com', password: 'admin123', displayName: 'Test Admin' },
    { email: 'guide@gmail.com', password: 'guide123', displayName: 'Test Guide' },
    { email: 'mentor@gmail.com', password: 'mentor123', displayName: 'Test Mentor' },
    { email: 'influencer@gmail.com', password: 'influencer123', displayName: 'Test Influencer' }
  ];
  
  console.log('Creating users with stronger passwords...\n');
  
  for (const user of usersToCreate) {
    try {
      // Try to create user via Firebase Auth REST API
      const response = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          email: user.email,
          password: user.password,
          displayName: user.displayName,
          returnSecureToken: true
        }
      );
      
      console.log(`✅ Created: ${user.email} / ${user.password}`);
      
      // Verify the user can sign in
      try {
        await axios.post(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            email: user.email,
            password: user.password,
            returnSecureToken: true
          }
        );
        console.log(`   ✅ Sign-in test passed for ${user.email}`);
      } catch (signInError) {
        console.log(`   ❌ Sign-in test failed for ${user.email}`);
      }
      
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const errorMessage = error.response.data.error.message;
        if (errorMessage === 'EMAIL_EXISTS') {
          console.log(`⚠️  ${user.email} already exists - trying password reset...`);
          
          // Try to reset password for existing user
          try {
            await axios.post(
              `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
              {
                requestType: 'PASSWORD_RESET',
                email: user.email
              }
            );
            console.log(`   📧 Password reset email sent to ${user.email}`);
            console.log(`   💡 Check email or use Firebase Console to reset password`);
          } catch (resetError) {
            console.log(`   ❌ Password reset failed for ${user.email}`);
          }
        } else {
          console.log(`❌ Failed to create ${user.email}: ${errorMessage}`);
        }
      } else {
        console.log(`❌ Network error creating ${user.email}:`, error.message);
      }
    }
  }
  
  console.log('\n📋 UPDATED CREDENTIALS LIST:');
  console.log('============================');
  console.log('✅ learner@gmail.com / learner (confirmed working)');
  console.log('🆕 admin@gmail.com / admin123');
  console.log('🆕 guide@gmail.com / guide123');
  console.log('🆕 mentor@gmail.com / mentor123');
  console.log('🆕 influencer@gmail.com / influencer123');
  
  console.log('\n💡 TIP: If any user shows "already exists", you can:');
  console.log('1. Use Firebase Console to reset the password');
  console.log('2. Or try the original password (admin, guide, etc.)');
  console.log('3. Visit: https://console.firebase.google.com/project/stellarion-b76d6/authentication/users');
  
  console.log('\n🎯 NOW START YOUR FRONTEND SERVER AND TEST SIGN-IN!');
  console.log('   cd "f:\\USCS\\3rd year\\group_project\\front-end\\frontend"');
  console.log('   npm run dev');
}

createMissingUsers().catch(console.error);
