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

async function testDirectTokenVerification() {
    console.log('🧪 Testing Direct Token Verification...');
    
    try {
        // Clean up any existing user
        try {
            const existingUser = await admin.auth().getUserByEmail('tokentest@example.com');
            await admin.auth().deleteUser(existingUser.uid);
            console.log('🧹 Cleaned up existing user');
        } catch (e) {
            console.log('ℹ️ No existing user to clean up');
        }
        
        // Create a Firebase user
        const firebaseUser = await admin.auth().createUser({
            email: 'tokentest@example.com',
            displayName: 'Token Test User',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        console.log('✅ Custom token generated (length:', customToken.length, ')');
        
        // Try to verify the custom token directly using Firebase Admin
        try {
            const verified = await admin.auth().verifyIdToken(customToken);
            console.log('❌ Custom token verified as ID token (this should fail)');
        } catch (error) {
            console.log('✅ Custom token correctly rejected as ID token');
        }
        
        // Try to test with the auth endpoint directly
        console.log('\n🧪 Testing email sign-up to get a valid token...');
        
        // Clean up the user we created
        await admin.auth().deleteUser(firebaseUser.uid);
        
        // Test email sign-up which should create a proper token
        const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: 'tokentest@example.com',
            password: 'testpass123',
            first_name: 'Token',
            last_name: 'Test',
            role: 'learner'
        });
        
        console.log('✅ Email sign-up successful');
        console.log('   Custom token received:', signupResponse.data.customToken ? 'Yes' : 'No');
        
        if (signupResponse.data.customToken) {
            // Now test the profile endpoint using the generated token
            console.log('\n🧪 Testing profile fetch with custom token...');
            
            const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${signupResponse.data.customToken}`
                }
            });
            
            console.log('✅ Profile fetch successful with custom token:');
            console.log('   Email:', profileResponse.data.data?.email);
            console.log('   Display name:', profileResponse.data.data?.display_name);
        }
        
        // Clean up
        try {
            const cleanupUser = await admin.auth().getUserByEmail('tokentest@example.com');
            await admin.auth().deleteUser(cleanupUser.uid);
            console.log('✅ Cleanup successful');
        } catch (e) {
            console.log('ℹ️ Cleanup not needed');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        return false;
    }
}

testDirectTokenVerification().then(success => {
    console.log('\n📊 Direct Token Verification Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);
