const { Pool } = require('pg');
const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
    });
}

async function cleanupTestUsers() {
    const pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'stellarion_db',
        password: process.env.DB_PASSWORD || 'admin123',
        port: process.env.DB_PORT || 5432,
    });
    
    try {
        console.log('🧹 Cleaning up test users...');
        
        // Delete test users from database
        const result = await pool.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%example.com'");
        console.log('✅ Deleted', result.rowCount, 'test users from database');
        
        // Delete test users from Firebase
        const firebaseUsers = await admin.auth().listUsers(1000);
        let deletedCount = 0;
        
        for (const user of firebaseUsers.users) {
            if (user.email && (user.email.includes('test') || user.email.includes('example.com'))) {
                try {
                    await admin.auth().deleteUser(user.uid);
                    deletedCount++;
                    console.log('🧹 Deleted Firebase user:', user.email);
                } catch (e) {
                    console.log('⚠️ Failed to delete Firebase user:', user.email, e.message);
                }
            }
        }
        
        console.log('✅ Deleted', deletedCount, 'test users from Firebase');
        
    } catch (error) {
        console.error('❌ Cleanup error:', error.message);
    } finally {
        await pool.end();
    }
}

cleanupTestUsers().catch(console.error);
