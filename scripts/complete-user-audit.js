const axios = require('axios');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

const API_BASE_URL = 'http://localhost:5000/api';

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stellarion_db',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

// Helper function to completely clean up a test user
async function cleanupTestUser(email) {
    try {
        // Delete from Firebase
        try {
            const firebaseUser = await admin.auth().getUserByEmail(email);
            await admin.auth().deleteUser(firebaseUser.uid);
            console.log(`🧹 Cleaned up Firebase user: ${email}`);
        } catch (e) {
            console.log(`ℹ️ No Firebase user found for ${email}`);
        }
        
        // Delete from database
        try {
            const result = await pool.query('DELETE FROM users WHERE email = $1', [email]);
            if (result.rowCount > 0) {
                console.log(`🧹 Cleaned up database user: ${email}`);
            } else {
                console.log(`ℹ️ No database user found for ${email}`);
            }
        } catch (e) {
            console.log(`ℹ️ Database cleanup error for ${email}: ${e.message}`);
        }
    } catch (error) {
        console.log(`ℹ️ Cleanup error for ${email}: ${error.message}`);
    }
}

// Test 1: Email Sign-Up Flow
async function testEmailSignUp() {
    console.log('\n🧪 Testing Email Sign-Up Flow...');
    const testEmail = 'emailtest@example.com';
    
    try {
        // Clean up any existing user first
        await cleanupTestUser(testEmail);
        
        // Wait a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: testEmail,
            password: 'testpass123',
            first_name: 'Email',
            last_name: 'Test',
            role: 'learner'
        });
        
        console.log('✅ Email sign-up successful');
        console.log('📄 Response:', response.data);
        
        // Verify user was created in database
        const dbResult = await pool.query('SELECT * FROM users WHERE email = $1', [testEmail]);
        console.log('📊 User in database:', dbResult.rows.length > 0 ? 'Yes' : 'No');
        
        if (dbResult.rows.length > 0) {
            const user = dbResult.rows[0];
            console.log('👤 User details:', {
                id: user.id,
                email: user.email,
                firebase_uid: user.firebase_uid,
                role: user.role,
                is_active: user.is_active,
                display_name: user.display_name
            });
            
            // Check if user settings were created
            const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [user.id]);
            console.log('⚙️ User settings created:', settingsResult.rows.length > 0 ? 'Yes' : 'No');
        }
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Email sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 2: Email Sign-In Flow
async function testEmailSignIn() {
    console.log('\n🧪 Testing Email Sign-In Flow...');
    const testEmail = 'emailtest@example.com';
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
            email: testEmail,
            password: 'testpass123'
        });
        
        console.log('✅ Email sign-in successful');
        console.log('📄 Response:', response.data);
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Email sign-in failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 3: Google Sign-Up Flow (Registration)
async function testGoogleSignUp() {
    console.log('\n🧪 Testing Google Sign-Up Flow...');
    const testEmail = 'googletest@example.com';
    
    try {
        // Clean up any existing user first
        await cleanupTestUser(testEmail);
        
        // Wait a moment for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create Firebase user (simulating Google authentication)
        const firebaseUser = await admin.auth().createUser({
            email: testEmail,
            displayName: 'Google Test User',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        console.log('✅ Custom token generated');
        
        // Register user in our database
        const response = await axios.post(`${API_BASE_URL}/users/register`, {
            firebaseUser: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName
            },
            first_name: 'Google',
            last_name: 'Test',
            role: 'learner'
        }, {
            headers: {
                'Authorization': `Bearer ${customToken}`
            }
        });
        
        console.log('✅ Google sign-up registration successful');
        console.log('📄 Response:', response.data);
        
        // Verify user was created in database
        const dbResult = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUser.uid]);
        console.log('📊 User in database:', dbResult.rows.length > 0 ? 'Yes' : 'No');
        
        if (dbResult.rows.length > 0) {
            const user = dbResult.rows[0];
            console.log('👤 User details:', {
                id: user.id,
                email: user.email,
                firebase_uid: user.firebase_uid,
                role: user.role,
                is_active: user.is_active,
                display_name: user.display_name
            });
            
            // Check if user settings were created
            const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [user.id]);
            console.log('⚙️ User settings created:', settingsResult.rows.length > 0 ? 'Yes' : 'No');
        }
        
        return { success: true, data: response.data, customToken, firebaseUser };
    } catch (error) {
        console.error('❌ Google sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 4: Profile Fetch
async function testProfileFetch(customToken) {
    console.log('\n🧪 Testing Profile Fetch...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${customToken}`
            }
        });
        
        console.log('✅ Profile fetch successful');
        console.log('📄 Response:', response.data);
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Profile fetch failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 5: Profile Update
async function testProfileUpdate(customToken) {
    console.log('\n🧪 Testing Profile Update...');
    
    try {
        const response = await axios.put(`${API_BASE_URL}/auth/profile`, {
            first_name: 'Updated',
            last_name: 'Name'
        }, {
            headers: {
                'Authorization': `Bearer ${customToken}`
            }
        });
        
        console.log('✅ Profile update successful');
        console.log('📄 Response:', response.data);
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Profile update failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 6: Password Reset
async function testPasswordReset() {
    console.log('\n🧪 Testing Password Reset...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
            email: 'emailtest@example.com'
        });
        
        console.log('✅ Password reset successful');
        console.log('📄 Response:', response.data);
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Password reset failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Main comprehensive test runner
async function runCompleteUserAudit() {
    console.log('🚀 Starting Complete User Authentication Audit...');
    console.log('==================================================');
    
    const results = [];
    
    try {
        // Test 1: Email Sign-Up
        const emailSignUpResult = await testEmailSignUp();
        results.push({ name: 'Email Sign-Up', ...emailSignUpResult });
        
        // Test 2: Email Sign-In (only if sign-up succeeded)
        if (emailSignUpResult.success) {
            const emailSignInResult = await testEmailSignIn();
            results.push({ name: 'Email Sign-In', ...emailSignInResult });
        }
        
        // Test 3: Google Sign-Up
        const googleSignUpResult = await testGoogleSignUp();
        results.push({ name: 'Google Sign-Up', ...googleSignUpResult });
        
        // Test 4: Profile Fetch (if Google sign-up succeeded)
        if (googleSignUpResult.success && googleSignUpResult.customToken) {
            const profileFetchResult = await testProfileFetch(googleSignUpResult.customToken);
            results.push({ name: 'Profile Fetch', ...profileFetchResult });
            
            // Test 5: Profile Update
            const profileUpdateResult = await testProfileUpdate(googleSignUpResult.customToken);
            results.push({ name: 'Profile Update', ...profileUpdateResult });
        }
        
        // Test 6: Password Reset
        const passwordResetResult = await testPasswordReset();
        results.push({ name: 'Password Reset', ...passwordResetResult });
        
    } catch (error) {
        console.error('❌ Test runner error:', error.message);
    }
    
    // Clean up test users
    console.log('\n🧹 Cleaning up test users...');
    await cleanupTestUser('emailtest@example.com');
    await cleanupTestUser('googletest@example.com');
    
    // Print comprehensive results
    console.log('\n📊 COMPLETE USER AUDIT RESULTS:');
    console.log('================================');
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${result.name}: ${status}`);
        if (!result.success && result.error) {
            const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
            console.log(`   Error: ${errorMsg}`);
        }
    });
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📈 Overall Score: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
        console.log('🎉 All user authentication flows are working correctly!');
        console.log('✨ The system is ready for production use.');
    } else {
        console.log('⚠️ Some user authentication flows need attention.');
        console.log('🔧 Issues found that need to be fixed:');
        
        const failedTests = results.filter(r => !r.success);
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${typeof test.error === 'string' ? test.error : JSON.stringify(test.error)}`);
        });
    }
    
    // Close database connection
    await pool.end();
    
    return results;
}

// Run the complete audit
runCompleteUserAudit().catch(console.error);
