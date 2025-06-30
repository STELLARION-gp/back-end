// scripts/create-firebase-users.js
const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function createFirebaseUsers() {
  try {
    console.log('🔥 Creating Firebase test users...');

    const users = [
      {
        uid: 'admin-firebase-uid',
        email: 'admin@gmail.com',
        password: 'admin',
        displayName: 'System Administrator',
        emailVerified: true,
      },
        {
            uid: 'moderator-firebase-uid',
            email: 'moderator@gmail.com',
            password: 'moderator',
            displayName: 'System Moderator',
            emailVerified: true,
        },
        {
            uid: 'learner-firebase-uid',
            email: 'learner@gmail.com',
            password: 'learner',
            displayName: 'Test Learner',
            emailVerified: true,
        },
        {
            uid: 'guide-firebase-uid',
            email: 'guide@gmail.com',
            password: 'guide',
            displayName: 'Test Guide',
            emailVerified: true,
        },
        {
            uid: 'enthusiast-firebase-uid',
            email: 'enthusiast@gmail.com',
            password: 'enthusiast',
            displayName: 'Test Enthusiast',
            emailVerified: true,
        },
        {
            uid: 'mentor-firebase-uid',
            email: 'mentor@gmail.com',
            password: 'mentor',
            displayName: 'Test Mentor',
            emailVerified: true,
        },
        {
            uid: 'influencer-firebase-uid',
            email: 'influencer@gmail.com',
            password: 'influencer',
            displayName: 'Test Influencer',
            emailVerified: true,
        }
    ];

    for (const userData of users) {
      try {
        // Check if user already exists
        try {
          await admin.auth().getUser(userData.uid);
          console.log(`✅ User ${userData.email} already exists`);
          continue;
        } catch (error) {
          if (error.code !== 'auth/user-not-found') {
            throw error;
          }
        }

        // Create the user
        await admin.auth().createUser(userData);
        console.log(`✅ Created Firebase user: ${userData.email}`);
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          console.log(`✅ User ${userData.email} already exists`);
        } else {
          console.error(`❌ Failed to create user ${userData.email}:`, error.message);
        }
      }
    }

    console.log('🎉 Firebase users creation completed!');
  } catch (error) {
    console.error('❌ Firebase users creation failed:', error);
  }
}

// Run the function if this script is called directly
if (require.main === module) {
  createFirebaseUsers().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = createFirebaseUsers;
