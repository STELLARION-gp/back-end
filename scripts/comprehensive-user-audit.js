const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin SDK
const serviceAccount = require('../serviceAccountKey.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

const API_BASE_URL = 'http://localhost:5000';

// Test data
const testUsers = [
    {
        type: 'email',
        email: 'emailtest@example.com',
        password: 'testpass123',
        first_name: 'Email',
        last_name: 'Test',
        role: 'learner'
    },
    {
        type: 'google',
        email: 'googletest@example.com',
        first_name: 'Google',
        last_name: 'Test',
        role: 'learner'
    }
];

// Helper function to create a test user and get Firebase token
async function createTestUserAndGetToken(user) {
    try {
        console.log(`🔄 Creating Firebase user for ${user.type} test...`);
        
        // Create user in Firebase
        const firebaseUser = await admin.auth().createUser({
            email: user.email,
            password: user.password || 'testpass123',
            displayName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : undefined,
        });

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        
        // Get ID token (simulating client-side Firebase auth)
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY || 'test-key'}`, {
            token: customToken,
            returnSecureToken: true
        });
        
        const idToken = idTokenResponse.data.idToken;
        
        return {
            firebaseUser,
            idToken,
            customToken
        };
    } catch (error) {
        console.error(`❌ Error creating test user for ${user.type}:`, error.message);
        throw error;
    }
}

// Helper function to clean up test user
async function cleanupTestUser(email) {
    try {
        const firebaseUser = await admin.auth().getUserByEmail(email);
        await admin.auth().deleteUser(firebaseUser.uid);
        
        // Also delete from database
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'stellarion_db',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
        });
        
        await pool.query('DELETE FROM users WHERE email = $1', [email]);
        await pool.end();
    } catch (error) {
        console.log(`ℹ️ Test user ${email} cleanup: ${error.message}`);
    }
}

// Test functions
async function testEmailSignUp() {
    console.log('\n🧪 Testing Email Sign-Up Flow...');
    const user = testUsers[0];
    
    try {
        // Clean up any existing user first
        await cleanupTestUser(user.email);
        
        // Test email sign-up
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: user.email,
            password: user.password,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        });
        
        console.log('✅ Email sign-up successful:', response.data);
        
        // Verify user was created in database
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'stellarion_db',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
        });
        
        const dbResult = await pool.query('SELECT * FROM users WHERE email = $1', [user.email]);
        console.log('✅ User in database:', dbResult.rows[0] ? 'Yes' : 'No');
        
        // Check if user settings were created
        if (dbResult.rows[0]) {
            const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [dbResult.rows[0].id]);
            console.log('✅ User settings created:', settingsResult.rows[0] ? 'Yes' : 'No');
        }
        
        await pool.end();
        
        return { success: true, user: response.data.user, customToken: response.data.customToken };
    } catch (error) {
        console.error('❌ Email sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testEmailSignIn() {
    console.log('\n🧪 Testing Email Sign-In Flow...');
    const user = testUsers[0];
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/signin`, {
            email: user.email,
            password: user.password
        });
        
        console.log('✅ Email sign-in successful:', response.data);
        return { success: true, user: response.data.user, customToken: response.data.customToken };
    } catch (error) {
        console.error('❌ Email sign-in failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testGoogleSignUp() {
    console.log('\n🧪 Testing Google Sign-Up Flow...');
    const user = testUsers[1];
    
    try {
        // Clean up any existing user first
        await cleanupTestUser(user.email);
        
        // Create Firebase user (simulating Google sign-up)
        const { firebaseUser, idToken } = await createTestUserAndGetToken(user);
        
        // Test registration endpoint
        const response = await axios.post(`${API_BASE_URL}/users/register`, {
            firebaseUser: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: `${user.first_name} ${user.last_name}`
            },
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role
        }, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Google sign-up registration successful:', response.data);
        
        // Verify user was created in database
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'stellarion_db',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
        });
        
        const dbResult = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebaseUser.uid]);
        console.log('✅ User in database:', dbResult.rows[0] ? 'Yes' : 'No');
        
        // Check if user settings were created
        if (dbResult.rows[0]) {
            const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [dbResult.rows[0].id]);
            console.log('✅ User settings created:', settingsResult.rows[0] ? 'Yes' : 'No');
        }
        
        await pool.end();
        
        return { success: true, user: response.data.data, idToken };
    } catch (error) {
        console.error('❌ Google sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testProfileFetch(idToken) {
    console.log('\n🧪 Testing Profile Fetch...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Profile fetch successful:', response.data);
        return { success: true, profile: response.data.data };
    } catch (error) {
        console.error('❌ Profile fetch failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

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
        
        console.log('✅ Profile update successful:', response.data);
        return { success: true, profile: response.data.data };
    } catch (error) {
        console.error('❌ Profile update failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testPasswordChange(idToken) {
    console.log('\n🧪 Testing Password Change...');
    
    try {
        const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
            newPassword: 'newtestpass123'
        }, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Password change successful:', response.data);
        return { success: true };
    } catch (error) {
        console.error('❌ Password change failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testSignOut(idToken) {
    console.log('\n🧪 Testing Sign Out...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/signout`, {}, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Sign out successful:', response.data);
        return { success: true };
    } catch (error) {
        console.error('❌ Sign out failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testResetPassword() {
    console.log('\n🧪 Testing Password Reset...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
            email: testUsers[0].email
        });
        
        console.log('✅ Password reset successful:', response.data);
        return { success: true };
    } catch (error) {
        console.error('❌ Password reset failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

// Main comprehensive test function
async function runComprehensiveUserAudit() {
    console.log('🚀 Starting Comprehensive User Authentication Audit...\n');
    
    const results = {
        emailSignUp: null,
        emailSignIn: null,
        googleSignUp: null,
        profileFetch: null,
        profileUpdate: null,
        passwordChange: null,
        signOut: null,
        resetPassword: null
    };
    
    try {
        // Test 1: Email Sign-Up
        results.emailSignUp = await testEmailSignUp();
        
        if (results.emailSignUp.success) {
            // Test 2: Email Sign-In
            results.emailSignIn = await testEmailSignIn();
            
            if (results.emailSignIn.success) {
                // Get ID token for further tests
                const { customToken } = results.emailSignIn;
                
                // We need to convert custom token to ID token for API calls
                const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.FIREBASE_API_KEY || 'test-key'}`, {
                    token: customToken,
                    returnSecureToken: true
                });
                
                const idToken = idTokenResponse.data.idToken;
                
                // Test 3: Profile Fetch
                results.profileFetch = await testProfileFetch(idToken);
                
                // Test 4: Profile Update
                results.profileUpdate = await testProfileUpdate(idToken);
                
                // Test 5: Password Change
                results.passwordChange = await testPasswordChange(idToken);
                
                // Test 6: Sign Out
                results.signOut = await testSignOut(idToken);
            }
        }
        
        // Test 7: Google Sign-Up
        results.googleSignUp = await testGoogleSignUp();
        
        // Test 8: Password Reset
        results.resetPassword = await testResetPassword();
        
    } catch (error) {
        console.error('❌ Comprehensive test failed:', error.message);
    }
    
    // Clean up test users
    console.log('\n🧹 Cleaning up test users...');
    for (const user of testUsers) {
        await cleanupTestUser(user.email);
    }
    
    // Print results summary
    console.log('\n📊 COMPREHENSIVE USER AUDIT RESULTS:');
    console.log('=====================================');
    
    Object.entries(results).forEach(([test, result]) => {
        const status = result?.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${test}: ${status}`);
        if (!result?.success && result?.error) {
            console.log(`   Error: ${JSON.stringify(result.error)}`);
        }
    });
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r?.success).length;
    
    console.log(`\n📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All user authentication flows are working correctly!');
    } else {
        console.log('⚠️ Some user authentication flows need attention.');
    }
}

// Run the comprehensive audit
runComprehensiveUserAudit().catch(console.error);
