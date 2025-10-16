// scripts/diagnose-signup.ts
import { PrismaClient } from '../prisma/generated/client';
import admin from '../firebaseAdmin';
import axios from 'axios';

const prisma = new PrismaClient();

async function diagnoseSignup() {
    const testEmail = `diagnose-${Date.now()}@example.com`;
    console.log(`\n🔍 Diagnosing signup flow with email: ${testEmail}\n`);

    try {
        // Step 1: Check initial state
        console.log('1️⃣  Checking if user already exists in database...');
        const existingUser = await prisma.users.findUnique({
            where: { email: testEmail }
        });
        console.log(`   ${existingUser ? '❌' : '✅'} User ${existingUser ? 'EXISTS' : 'DOES NOT EXIST'} in database\n`);

        // Step 2: Create user in Firebase
        console.log('2️⃣  Creating user in Firebase...');
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().createUser({
                email: testEmail,
                password: 'test123456',
                displayName: 'Diagnose Test'
            });
            console.log(`   ✅ Firebase user created: ${firebaseUser.uid}\n`);
        } catch (error: any) {
            console.log(`   ❌ Firebase creation failed: ${error.message}\n`);
            return;
        }

        // Step 3: Try to create user in database
        console.log('3️⃣  Creating user in database...');
        try {
            const result = await prisma.$transaction(async (tx) => {
                const newUser = await tx.users.create({
                    data: {
                        firebase_uid: firebaseUser.uid,
                        email: testEmail,
                        first_name: 'Diagnose',
                        last_name: 'Test',
                        display_name: 'Diagnose Test',
                        role: 'learner',
                        is_active: true,
                        created_at: new Date(),
                        updated_at: new Date(),
                        last_login: new Date(),
                    }
                });

                console.log(`   ✅ User created in database: ID ${newUser.id}`);

                await tx.user_settings.create({
                    data: {
                        user_id: newUser.id,
                        language: 'en',
                        email_notifications: true,
                        push_notifications: true,
                        profile_visibility: 'public',
                        allow_direct_messages: true,
                        show_online_status: true,
                        theme: 'dark',
                        timezone: 'UTC',
                    }
                });

                console.log(`   ✅ User settings created\n`);
                return newUser;
            });

            // Step 4: Generate custom token
            console.log('4️⃣  Generating custom token...');
            const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
            console.log(`   ✅ Custom token generated\n`);

            // Step 5: Verify user exists
            console.log('5️⃣  Verifying user exists in database...');
            const verifyUser = await prisma.users.findUnique({
                where: { firebase_uid: firebaseUser.uid },
                include: { user_settings: true }
            });

            if (verifyUser) {
                console.log(`   ✅ User verified in database!`);
                console.log(`   - Database ID: ${verifyUser.id}`);
                console.log(`   - Firebase UID: ${verifyUser.firebase_uid}`);
                console.log(`   - Email: ${verifyUser.email}`);
                console.log(`   - Settings: ${verifyUser.user_settings ? 'Created' : 'Missing'}\n`);
            } else {
                console.log(`   ❌ User NOT found in database after creation!\n`);
            }

            // Step 6: Test signin
            console.log('6️⃣  Testing sign-in with Firebase REST API...');
            const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
            if (!FIREBASE_API_KEY) {
                console.log(`   ⚠️  FIREBASE_API_KEY not set - skipping signin test\n`);
            } else {
                try {
                    const signInResponse = await axios.post(
                        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
                        {
                            email: testEmail,
                            password: 'test123456',
                            returnSecureToken: true
                        }
                    );
                    console.log(`   ✅ Sign-in successful with Firebase\n`);

                    // Check if user exists in database for signin
                    const signInUser = await prisma.users.findUnique({
                        where: { firebase_uid: signInResponse.data.localId }
                    });

                    if (signInUser) {
                        console.log(`   ✅ User found in database during sign-in!`);
                    } else {
                        console.log(`   ❌ User NOT found in database during sign-in!`);
                        console.log(`   🚨 THIS IS THE PROBLEM!\n`);
                    }
                } catch (error: any) {
                    console.log(`   ❌ Sign-in failed: ${error.response?.data?.error?.message || error.message}\n`);
                }
            }

            // Cleanup
            console.log('\n🧹 Cleaning up test data...');
            await prisma.user_settings.delete({ where: { user_id: result.id } });
            await prisma.users.delete({ where: { id: result.id } });
            await admin.auth().deleteUser(firebaseUser.uid);
            console.log('   ✅ Cleanup complete\n');

            console.log('✅ DIAGNOSIS COMPLETE - Signup flow appears to be working correctly!\n');

        } catch (dbError: any) {
            console.log(`   ❌ Database error: ${dbError.message}`);
            console.log(`   Error code: ${dbError.code}`);
            console.log(`   \n🚨 THIS IS THE PROBLEM - Database transaction is failing!\n`);
            
            // Clean up Firebase user
            console.log('🧹 Cleaning up Firebase user...');
            await admin.auth().deleteUser(firebaseUser.uid);
            console.log('   ✅ Firebase cleanup complete\n');
        }

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

diagnoseSignup();
