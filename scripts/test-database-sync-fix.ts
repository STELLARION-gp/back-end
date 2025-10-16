#!/usr/bin/env ts-node

/**
 * Test script to verify the database sync fix
 * This simulates the frontend registration flow
 */

import admin from '../firebaseAdmin';
import axios from 'axios';
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000';

interface TestUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

async function cleanup(email: string) {
  console.log('\n🧹 Cleaning up test user...');
  
  try {
    // Delete from database
    await prisma.users.delete({ where: { email } });
    console.log('  ✅ Deleted from database');
  } catch (e) {
    console.log('  ℹ️  User not in database');
  }

  try {
    // Delete from Firebase
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log('  ✅ Deleted from Firebase');
  } catch (e) {
    console.log('  ℹ️  User not in Firebase');
  }
}

async function testRegistrationFlow() {
  const testUser: TestUser = {
    email: `test-${Date.now()}@stellarion.test`,
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'User'
  };

  console.log('🧪 Testing Database Sync Fix');
  console.log('================================\n');

  try {
    // Step 1: Create user in Firebase (simulating frontend)
    console.log('Step 1: Creating user in Firebase...');
    const firebaseUser = await admin.auth().createUser({
      email: testUser.email,
      password: testUser.password,
      displayName: `${testUser.first_name} ${testUser.last_name}`
    });
    console.log(`  ✅ Firebase user created: ${firebaseUser.uid}`);

    // Step 2: Get Firebase ID token (simulating frontend)
    console.log('\nStep 2: Generating Firebase ID token...');
    const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
    
    // Exchange custom token for ID token (this would normally happen in frontend)
    const tokenResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY}`,
      { token: customToken, returnSecureToken: true }
    );
    const idToken = tokenResponse.data.idToken;
    console.log(`  ✅ ID token generated`);

    // Step 3: Call /api/users/register (simulating frontend)
    console.log('\nStep 3: Calling /api/users/register...');
    const registerResponse = await axios.post(
      `${API_URL}/api/users/register`,
      {
        firebaseUser: {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: `${testUser.first_name} ${testUser.last_name}`
        },
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: 'learner'
      },
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`  ✅ Registration response:`, registerResponse.data);

    // Step 4: Verify user exists in database
    console.log('\nStep 4: Verifying user in database...');
    const dbUser = await prisma.users.findUnique({
      where: { firebase_uid: firebaseUser.uid },
      include: { user_settings: true }
    });

    if (!dbUser) {
      console.log('  ❌ FAIL: User not found in database!');
      await cleanup(testUser.email);
      process.exit(1);
    }

    console.log(`  ✅ User found in database:`);
    console.log(`     ID: ${dbUser.id}`);
    console.log(`     Email: ${dbUser.email}`);
    console.log(`     Name: ${dbUser.display_name}`);
    console.log(`     Role: ${dbUser.role}`);
    console.log(`     Settings: ${dbUser.user_settings ? '✅ Created' : '❌ Missing'}`);

    // Step 5: Test sign-in after signup
    console.log('\nStep 5: Testing sign-in after signup...');
    const profileResponse = await axios.get(
      `${API_URL}/api/users/profile`,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      }
    );

    console.log(`  ✅ Profile fetched successfully:`, profileResponse.data);

    // Cleanup
    await cleanup(testUser.email);

    console.log('\n✅ ALL TESTS PASSED! Database sync is working correctly.\n');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.response?.data || error.message);
    
    await cleanup(testUser.email);
    process.exit(1);
  }
}

// Run the test
testRegistrationFlow()
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    admin.app().delete();
  });
