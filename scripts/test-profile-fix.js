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

async function testProfileFetchFix() {
    console.log('🧪 Testing Profile Fetch Fix...');
    
    try {
        // Clean up any existing user
        try {
            const existingUser = await admin.auth().getUserByEmail('profiletest@example.com');
            await admin.auth().deleteUser(existingUser.uid);
        } catch (e) {
            // User doesn't exist, that's fine
        }
        
        // Create a Firebase user
        const firebaseUser = await admin.auth().createUser({
            email: 'profiletest@example.com',
            displayName: 'Profile Test User',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Get ID token
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M`, {
            token: await admin.auth().createCustomToken(firebaseUser.uid),
            returnSecureToken: true
        });
        
        const idToken = idTokenResponse.data.idToken;
        console.log('✅ ID token obtained');
        
        // Test profile fetch (should auto-create user)
        const response = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${idToken}`
            }
        });
        
        console.log('✅ Profile fetch successful:');
        console.log('   Email:', response.data.data?.email);
        console.log('   Display name:', response.data.data?.display_name);
        console.log('   Role:', response.data.data?.role);
        console.log('   Active:', response.data.data?.is_active);
        
        // Clean up
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log('✅ Cleanup successful');
        
        return true;
        
    } catch (error) {
        console.error('❌ Profile fetch test failed:', error.response?.data || error.message);
        return false;
    }
}

testProfileFetchFix().then(success => {
    console.log('\n📊 Profile Fetch Fix Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);
