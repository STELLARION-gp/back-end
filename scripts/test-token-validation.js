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

const FIREBASE_WEB_API_KEY = 'AIzaSyBadpzMDQbSPAUm7ZnVg5JrTx4aYI9Fw9M';

async function testTokenValidation() {
    console.log('🧪 Testing Token Validation...');
    
    try {
        // Create a test user
        const firebaseUser = await admin.auth().createUser({
            email: 'tokenvalidation@example.com',
            emailVerified: true
        });
        
        console.log('✅ Firebase user created:', firebaseUser.uid);
        
        // Generate custom token
        const customToken = await admin.auth().createCustomToken(firebaseUser.uid);
        console.log('✅ Custom token generated');
        
        // Exchange for ID token
        const idTokenResponse = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`, {
            token: customToken,
            returnSecureToken: true
        });
        
        const idToken = idTokenResponse.data.idToken;
        console.log('✅ ID token obtained, length:', idToken.length);
        
        // Now test the token validation directly
        console.log('\n📝 Testing direct token validation...');
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            console.log('✅ Token validation successful');
            console.log('   UID:', decodedToken.uid);
            console.log('   Email:', decodedToken.email);
            console.log('   Issuer:', decodedToken.iss);
            console.log('   Audience:', decodedToken.aud);
            console.log('   Issued at:', new Date(decodedToken.iat * 1000).toISOString());
            console.log('   Expires at:', new Date(decodedToken.exp * 1000).toISOString());
            
            // Test if token is expired
            const now = Math.floor(Date.now() / 1000);
            console.log('   Is expired:', decodedToken.exp < now);
            
        } catch (verifyError) {
            console.error('❌ Token validation failed:', verifyError.message);
            console.error('   Error code:', verifyError.code);
            console.error('   Error details:', verifyError.errorInfo);
        }
        
        // Clean up
        await admin.auth().deleteUser(firebaseUser.uid);
        console.log('✅ Cleanup successful');
        
        return true;
        
    } catch (error) {
        console.error('❌ Token validation test failed:', error.message);
        return false;
    }
}

testTokenValidation().then(success => {
    console.log('\n📊 Token Validation Test:', success ? '✅ PASSED' : '❌ FAILED');
    process.exit(success ? 0 : 1);
}).catch(console.error);
