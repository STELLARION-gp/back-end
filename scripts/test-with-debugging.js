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
const FIREBASE_WEB_API_KEY = 'AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M';

async function testWithDebugging() {
    console.log('🧪 Testing with Enhanced Debugging...');
    
    try {
        // Clean up
        try {
            const existingUser = await admin.auth().getUserByEmail('debug@example.com');
            await admin.auth().deleteUser(existingUser.uid);
            console.log('🧹 Cleaned up existing user');
        } catch (e) {
            console.log('ℹ️ No existing user to clean up');
        }
        
        // Create a test user directly in Firebase
        const firebaseUser = await admin.auth().createUser({
            email: 'debug@example.com',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Generate custom token and exchange for ID token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`, {
            token: customToken,
            returnSecureToken: true
        });
        
        const idToken = idTokenResponse.data.idToken;
        console.log('✅ ID token obtained, length:', idToken.length);
        
        // Verify token directly
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log('✅ Token verified directly, UID:', decodedToken.uid);
        
        // Now test the profile endpoint with debug headers
        console.log('\n📝 Testing profile endpoint with debug headers...');
        
        const headers = {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
        };
        
        console.log('📋 Request headers:', {
            'Authorization': `Bearer ${idToken.substring(0, 20)}...`,
            'Content-Type': 'application/json'
        });
        
        try {
            const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
                headers
            });
            
            console.log('✅ Profile fetch successful');
            console.log('   Response:', profileResponse.data);
            
        } catch (profileError) {
            console.error('❌ Profile fetch failed');
            console.error('   Status:', profileError.response?.status);
            console.error('   Response:', profileError.response?.data);
            console.error('   Error message:', profileError.message);
            
            // Let's also test a different endpoint to see if the token works elsewhere
            console.log('\n📝 Testing register endpoint to see if token works...');
            
            try {
                const registerResponse = await axios.post(`${API_BASE_URL}/users/register`, {
                    firebaseUser: {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: 'Debug User'
                    },
                    first_name: 'Debug',
                    last_name: 'User',
                    role: 'learner'
                }, {
                    headers
                });
                
                console.log('✅ Register endpoint successful');
                console.log('   Response:', registerResponse.data);
                
                // Now try profile fetch again
                console.log('\n📝 Trying profile fetch again after registration...');
                
                const profileResponse2 = await axios.get(`${API_BASE_URL}/users/profile`, {
                    headers
                });
                
                console.log('✅ Profile fetch successful after registration');
                console.log('   Response:', profileResponse2.data);
                
            } catch (registerError) {
                console.error('❌ Register endpoint also failed');
                console.error('   Status:', registerError.response?.status);
                console.error('   Response:', registerError.response?.data);
            }
        }
        
        // Clean up
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log('✅ Cleanup successful');
        
        return true;
        
    } catch (error) {
        console.error('❌ Debug test failed:', error.message);
        return false;
    }
}

testWithDebugging().then(success => {
    console.log('\n📊 Debug Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);
