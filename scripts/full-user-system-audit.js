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

// Helper function to create a Firebase user and get an ID token
async function createFirebaseUserAndGetIdToken(email, displayName, password = 'testpass123') {
    try {
        // Create user in Firebase
        const firebaseUser = await admin.auth().createUser({
            email,
            password,
            displayName,
            emailVerified: true
        });
        
        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        
        // Convert custom token to ID token using Firebase Auth REST API
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M`, {
            token: customToken,
            returnSecureToken: true
        });
        
        const idToken = idTokenResponse.data.idToken;
        
        return {
            firebaseUser,
            customToken,
            idToken
        };
    } catch (error) {
        console.error('Error creating Firebase user and getting ID token:', error.message);
        throw error;
    }
}

// Helper function to clean up test users
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
            const { Pool } = require('pg');
            const pool = new Pool({
                user: process.env.DB_USER || 'postgres',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'stellarion_db',
                password: process.env.DB_PASSWORD || 'admin123',
                port: process.env.DB_PORT || 5432,
            });
            
            const result = await pool.query('DELETE FROM users WHERE email = $1', [email]);
            if (result.rowCount > 0) {
                console.log(`🧹 Cleaned up database user: ${email}`);
            }
            
            await pool.end();
        } catch (e) {
            console.log(`ℹ️ Database cleanup error for ${email}: ${e.message}`);
        }
    } catch (error) {
        console.log(`ℹ️ Cleanup error for ${email}: ${error.message}`);
    }
}

// Test 1: Email Sign-Up
async function testEmailSignUp() {
    console.log('🧪 Testing Email Sign-Up...');
    const testEmail = 'emailtest@example.com';
    
    try {
        await cleanupTestUser(testEmail);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: testEmail,
            password: 'testpass123',
            first_name: 'Email',
            last_name: 'Test',
            role: 'learner'
        });
        
        console.log('✅ Email Sign-Up SUCCESS');
        console.log('   User created:', response.data.user?.email);
        console.log('   Display name:', response.data.user?.display_name);
        console.log('   User settings created:', response.data.user?.id ? 'Checking...' : 'Unknown');
        
        return { success: true, user: response.data.user, customToken: response.data.customToken };
    } catch (error) {
        console.error('❌ Email Sign-Up FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 2: Email Sign-In
async function testEmailSignIn() {
    console.log('\n🧪 Testing Email Sign-In...');
    const testEmail = 'emailtest@example.com';
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
            email: testEmail,
            password: 'testpass123'
        });
        
        console.log('✅ Email Sign-In SUCCESS');
        console.log('   User found:', response.data.user?.email);
        console.log('   User active:', response.data.user?.is_active);
        
        return { success: true, user: response.data.user, customToken: response.data.customToken };
    } catch (error) {
        console.error('❌ Email Sign-In FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 3: Google Sign-Up (Registration)
async function testGoogleSignUp() {
    console.log('\n🧪 Testing Google Sign-Up...');
    const testEmail = 'googletest@example.com';
    
    try {
        await cleanupTestUser(testEmail);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create Firebase user and get ID token
        const { firebaseUser, idToken } = await createFirebaseUserAndGetIdToken(testEmail, 'Google Test User');
        
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
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Google Sign-Up SUCCESS');
        console.log('   User created:', response.data.data?.email);
        console.log('   Display name:', response.data.data?.display_name);
        
        return { success: true, user: response.data.data, idToken };
    } catch (error) {
        console.error('❌ Google Sign-Up FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 4: Profile Fetch
async function testProfileFetch(idToken) {
    console.log('\n🧪 Testing Profile Fetch...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Profile Fetch SUCCESS');
        console.log('   User email:', response.data.data?.email);
        console.log('   User role:', response.data.data?.role);
        console.log('   User active:', response.data.data?.is_active);
        
        return { success: true, profile: response.data.data };
    } catch (error) {
        console.error('❌ Profile Fetch FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 5: Profile Update
async function testProfileUpdate(idToken) {
    console.log('\n🧪 Testing Profile Update...');
    
    try {
        const response = await axios.put(`${API_BASE_URL}/auth/profile`, {
            first_name: 'Updated',
            last_name: 'Name'
        }, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Profile Update SUCCESS');
        console.log('   Updated name:', response.data.data?.display_name);
        
        return { success: true, profile: response.data.data };
    } catch (error) {
        console.error('❌ Profile Update FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 6: Password Change
async function testPasswordChange(idToken) {
    console.log('\n🧪 Testing Password Change...');
    
    try {
        const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
            new_password: 'newtestpass123'
        }, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Password Change SUCCESS');
        console.log('   Message:', response.data.message);
        
        return { success: true };
    } catch (error) {
        console.error('❌ Password Change FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 7: Password Reset
async function testPasswordReset() {
    console.log('\n🧪 Testing Password Reset...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
            email: 'emailtest@example.com'
        });
        
        console.log('✅ Password Reset SUCCESS');
        console.log('   Reset link generated');
        
        return { success: true };
    } catch (error) {
        console.error('❌ Password Reset FAILED:', error.response?.data?.message || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Test 8: User Settings Check
async function testUserSettingsCreation() {
    console.log('\n🧪 Testing User Settings Creation...');
    
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'stellarion_db',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
        });
        
        // Check if user settings were created for our test users
        const result = await pool.query(`
            SELECT u.email, u.display_name, us.id as settings_id, us.theme, us.language
            FROM users u
            LEFT JOIN user_settings us ON u.id = us.user_id
            WHERE u.email IN ('emailtest@example.com', 'googletest@example.com')
        `);
        
        console.log('✅ User Settings Check SUCCESS');
        console.log('   Found users with settings:', result.rows.length);
        
        result.rows.forEach(row => {
            console.log(`   - ${row.email}: ${row.settings_id ? 'Settings created' : 'No settings'}`);
        });
        
        await pool.end();
        
        return { success: true, settingsCount: result.rows.filter(r => r.settings_id).length };
    } catch (error) {
        console.error('❌ User Settings Check FAILED:', error.message);
        return { success: false, error: error.message };
    }
}

// Main test runner
async function runFullUserSystemAudit() {
    console.log('🚀 FULL USER SYSTEM AUDIT');
    console.log('==========================\n');
    
    const results = [];
    
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
    
    let workingIdToken = null;
    
    // Test 4: Profile Fetch (try with Google token first, then email)
    if (googleSignUpResult.success && googleSignUpResult.idToken) {
        workingIdToken = googleSignUpResult.idToken;
        const profileFetchResult = await testProfileFetch(workingIdToken);
        results.push({ name: 'Profile Fetch', ...profileFetchResult });
    } else if (emailSignUpResult.success && emailSignUpResult.customToken) {
        // Convert custom token to ID token
        try {
            const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M`, {
                token: emailSignUpResult.customToken,
                returnSecureToken: true
            });
            
            workingIdToken = idTokenResponse.data.idToken;
            const profileFetchResult = await testProfileFetch(workingIdToken);
            results.push({ name: 'Profile Fetch', ...profileFetchResult });
        } catch (error) {
            console.error('❌ Failed to convert custom token to ID token:', error.message);
            results.push({ name: 'Profile Fetch', success: false, error: 'Token conversion failed' });
        }
    }
    
    // Test 5: Profile Update (if we have a working token)
    if (workingIdToken) {
        const profileUpdateResult = await testProfileUpdate(workingIdToken);
        results.push({ name: 'Profile Update', ...profileUpdateResult });
        
        // Test 6: Password Change
        const passwordChangeResult = await testPasswordChange(workingIdToken);
        results.push({ name: 'Password Change', ...passwordChangeResult });
    }
    
    // Test 7: Password Reset
    const passwordResetResult = await testPasswordReset();
    results.push({ name: 'Password Reset', ...passwordResetResult });
    
    // Test 8: User Settings Creation
    const userSettingsResult = await testUserSettingsCreation();
    results.push({ name: 'User Settings Creation', ...userSettingsResult });
    
    // Clean up test users
    console.log('\n🧹 Cleaning up test users...');
    await cleanupTestUser('emailtest@example.com');
    await cleanupTestUser('googletest@example.com');
    
    // Print final results
    console.log('\n📊 FULL USER SYSTEM AUDIT RESULTS');
    console.log('===================================');
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${result.name}: ${status}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
        }
    });
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const percentage = Math.round((passed / total) * 100);
    
    console.log(`\n📈 OVERALL SCORE: ${passed}/${total} tests passed (${percentage}%)`);
    
    if (percentage >= 90) {
        console.log('🎉 EXCELLENT! User system is working correctly.');
    } else if (percentage >= 70) {
        console.log('👍 GOOD! Minor issues that need attention.');
    } else {
        console.log('⚠️ NEEDS WORK! Several critical issues found.');
    }
    
    // Summary of critical issues
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
        console.log('\n🔧 CRITICAL ISSUES TO FIX:');
        failedTests.forEach(test => {
            console.log(`   - ${test.name}: ${typeof test.error === 'string' ? test.error : JSON.stringify(test.error)}`);
        });
    }
    
    return results;
}

// Run the audit
runFullUserSystemAudit().catch(console.error);
