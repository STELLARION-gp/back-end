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

const API_BASE_URL = 'http://localhost:5000';

// Test functions
async function testEmailSignUp() {
    console.log('🧪 Testing Email Sign-Up...');
    
    try {
        // Clean up any existing test user
        try {
            const existingUser = await admin.auth().getUserByEmail('test@example.com');
            await admin.auth().deleteUser(existingUser.uid);
            console.log('🧹 Cleaned up existing Firebase user');
        } catch (e) {
            // User doesn't exist, that's fine
        }
        
        const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
            email: 'test@example.com',
            password: 'testpass123',
            first_name: 'Test',
            last_name: 'User',
            role: 'learner'
        });
        
        console.log('✅ Email sign-up successful:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Email sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testEmailSignIn() {
    console.log('🧪 Testing Email Sign-In...');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/api/auth/signin`, {
            email: 'test@example.com',
            password: 'testpass123'
        });
        
        console.log('✅ Email sign-in successful:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Email sign-in failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testGoogleSignUpFlow() {
    console.log('🧪 Testing Google Sign-Up Flow...');
    
    try {
        // Clean up any existing test user
        try {
            const existingUser = await admin.auth().getUserByEmail('googletest@example.com');
            await admin.auth().deleteUser(existingUser.uid);
            console.log('🧹 Cleaned up existing Firebase user');
        } catch (e) {
            // User doesn't exist, that's fine
        }
        
        // Create a Firebase user (simulating Google sign-up)
        const firebaseUser = await admin.auth().createUser({
            email: 'googletest@example.com',
            displayName: 'Google Test User',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Generate custom token for authentication
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        
        // Use the registration endpoint to create the user in the database
        const response = await axios.post(`${API_BASE_URL}/api/users/register`, {
            firebaseUser: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'Google Test User'
            },
            first_name: 'Google',
            last_name: 'Test',
            role: 'learner'
        }, {
            headers: {
                'Authorization': `Bearer ${customToken}`
            }
        });
        
        console.log('✅ Google sign-up registration successful:', response.data);
        return { success: true, data: response.data, customToken, firebaseUser };
    } catch (error) {
        console.error('❌ Google sign-up failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testProfileFetch(customToken) {
    console.log('🧪 Testing Profile Fetch...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/api/users/profile`, {
            headers: {
                'Authorization': `Bearer ${customToken}`
            }
        });
        
        console.log('✅ Profile fetch successful:', response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Profile fetch failed:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || error.message };
    }
}

async function testDatabaseSync() {
    console.log('🧪 Testing Database Sync...');
    
    try {
        const { Pool } = require('pg');
        const pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'stellarion_db',
            password: process.env.DB_PASSWORD || 'admin123',
            port: process.env.DB_PORT || 5432,
        });
        
        // Check if all test users exist in database
        const result = await pool.query('SELECT * FROM users WHERE email IN ($1, $2)', [
            'test@example.com', 
            'googletest@example.com'
        ]);
        
        console.log('✅ Users in database:', result.rows.length);
        result.rows.forEach(user => {
            console.log(`  - ${user.email} (${user.role}) - Active: ${user.is_active}`);
        });
        
        // Check user settings
        if (result.rows.length > 0) {
            const settingsResult = await pool.query('SELECT * FROM user_settings WHERE user_id = ANY($1)', [
                result.rows.map(u => u.id)
            ]);
            console.log('✅ User settings created:', settingsResult.rows.length);
        }
        
        await pool.end();
        
        return { success: true, userCount: result.rows.length };
    } catch (error) {
        console.error('❌ Database sync test failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function runFocusedUserAudit() {
    console.log('🚀 Running Focused User Authentication Audit...\n');
    
    const results = [];
    
    // Test 1: Email Sign-Up
    const emailSignUpResult = await testEmailSignUp();
    results.push({ test: 'Email Sign-Up', ...emailSignUpResult });
    
    // Test 2: Email Sign-In (only if sign-up succeeded)
    if (emailSignUpResult.success) {
        const emailSignInResult = await testEmailSignIn();
        results.push({ test: 'Email Sign-In', ...emailSignInResult });
    }
    
    // Test 3: Google Sign-Up Flow
    const googleSignUpResult = await testGoogleSignUpFlow();
    results.push({ test: 'Google Sign-Up', ...googleSignUpResult });
    
    // Test 4: Profile Fetch (if Google sign-up succeeded)
    if (googleSignUpResult.success && googleSignUpResult.customToken) {
        const profileResult = await testProfileFetch(googleSignUpResult.customToken);
        results.push({ test: 'Profile Fetch', ...profileResult });
    }
    
    // Test 5: Database Synchronization
    const dbSyncResult = await testDatabaseSync();
    results.push({ test: 'Database Sync', ...dbSyncResult });
    
    // Clean up test users
    console.log('\n🧹 Cleaning up test users...');
    try {
        const testUser = await admin.auth().getUserByEmail('test@example.com');
        await admin.auth().deleteUser(testUser.uid);
    } catch (e) {}
    
    try {
        const googleTestUser = await admin.auth().getUserByEmail('googletest@example.com');
        await admin.auth().deleteUser(googleTestUser.uid);
    } catch (e) {}
    
    // Print results
    console.log('\n📊 FOCUSED USER AUDIT RESULTS:');
    console.log('===============================');
    
    results.forEach(result => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${result.test}: ${status}`);
        if (!result.success && result.error) {
            console.log(`   Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
        }
    });
    
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`\n📈 Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All core user authentication flows are working!');
    } else {
        console.log('⚠️ Some user authentication flows need attention.');
    }
    
    return results;
}

// Run the focused audit
runFocusedUserAudit().catch(console.error);
