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
const FIREBASE_WEB_API_KEY = 'AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M'; // From Firebase console

async function testCompleteAuthFlow() {
    console.log('🧪 Testing Complete Auth Flow...');
    
    try {
        // Clean up any existing user
        try {
            const existingUser = await admin.auth().getUserByEmail('authflow@example.com');
            await admin.auth().deleteUser(existingUser.uid);
            console.log('🧹 Cleaned up existing user');
        } catch (e) {
            console.log('ℹ️ No existing user to clean up');
        }
        
        console.log('\n📝 Step 1: Email Sign-Up');
        const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
            email: 'authflow@example.com',
            password: 'testpass123',
            first_name: 'Auth',
            last_name: 'Flow',
            role: 'learner'
        });
        
        console.log('✅ Email sign-up successful');
        console.log('   User ID:', signupResponse.data.user?.id);
        console.log('   Display name:', signupResponse.data.user?.display_name);
        console.log('   Custom token received:', signupResponse.data.customToken ? 'Yes' : 'No');
        
        if (!signupResponse.data.customToken) {
            throw new Error('No custom token received from sign-up');
        }
        
        console.log('\n📝 Step 2: Exchange Custom Token for ID Token');
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`, {
            token: signupResponse.data.customToken,
            returnSecureToken: true
        });
        
        console.log('✅ Custom token exchanged for ID token');
        console.log('   ID token length:', idTokenResponse.data.idToken.length);
        console.log('   Refresh token received:', idTokenResponse.data.refreshToken ? 'Yes' : 'No');
        
        console.log('\n📝 Step 3: Profile Fetch with ID Token');
        const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${idTokenResponse.data.idToken}`
            }
        });
        
        console.log('✅ Profile fetch successful');
        console.log('   Email:', profileResponse.data.data?.email);
        console.log('   Display name:', profileResponse.data.data?.display_name);
        console.log('   Role:', profileResponse.data.data?.role);
        console.log('   Active:', profileResponse.data.data?.is_active);
        
        console.log('\n📝 Step 4: Profile Update');
        const profileUpdateResponse = await axios.put(`${API_BASE_URL}/auth/profile`, {
            first_name: 'Updated',
            last_name: 'Name'
        }, {
            headers: {
                'Authorization': `Bearer ${idTokenResponse.data.idToken}`
            }
        });
        
        console.log('✅ Profile update successful');
        console.log('   Updated display name:', profileUpdateResponse.data.data?.display_name);
        
        console.log('\n📝 Step 5: Password Reset');
        const passwordResetResponse = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
            email: 'authflow@example.com'
        });
        
        console.log('✅ Password reset successful');
        console.log('   Message:', passwordResetResponse.data.message);
        
        console.log('\n📝 Step 6: Email Sign-In');
        const signinResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
            email: 'authflow@example.com',
            password: 'testpass123'
        });
        
        console.log('✅ Email sign-in successful');
        console.log('   User email:', signinResponse.data.user?.email);
        console.log('   User active:', signinResponse.data.user?.is_active);
        
        // Clean up
        try {
            const cleanupUser = await admin.auth().getUserByEmail('authflow@example.com');
            await admin.auth().deleteUser(cleanupUser.uid);
            console.log('✅ Cleanup successful');
        } catch (e) {
            console.log('ℹ️ Cleanup not needed');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Complete auth flow test failed:', error.response?.data || error.message);
        
        // Clean up on error
        try {
            const cleanupUser = await admin.auth().getUserByEmail('authflow@example.com');
            await admin.auth().deleteUser(cleanupUser.uid);
            console.log('✅ Cleanup successful');
        } catch (e) {
            console.log('ℹ️ Cleanup not needed');
        }
        
        return false;
    }
}

testCompleteAuthFlow().then(success => {
    console.log('\n📊 Complete Auth Flow Test:', success ? '✅ PASSED' : '❌ FAILED');
    if (success) {
        console.log('🎉 All user authentication flows are working correctly!');
    }
    process.exit(success ? 0 : 1);
}).catch(console.error);
