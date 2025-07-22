const express = require('express');
const cors = require('cors');
const pool = require('./db.js').default;

const app = express();

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true
}));

app.use(express.json());

// Test database connection
app.get('/test-db', async (req, res) => {
    try {
        console.log('Testing database connection...');
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('Database connected successfully:', result.rows[0]);
        res.json({
            success: true,
            message: 'Database connection successful',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Test profile endpoint without auth
app.get('/test-profile', async (req, res) => {
    try {
        console.log('Testing profile query...');
        
        // Mock Firebase user for testing
        const mockFirebaseUser = {
            uid: 'test-uid',
            email: 'learner@gmail.com'
        };
        
        console.log('Mock Firebase UID:', mockFirebaseUser.uid);

        // Get user profile with settings
        const userQuery = `
            SELECT u.*, s.language, s.email_notifications, s.push_notifications, 
                   s.profile_visibility, s.allow_direct_messages, s.show_online_status, 
                   s.theme, s.timezone
            FROM users u
            LEFT JOIN user_settings s ON u.id = s.user_id
            WHERE u.firebase_uid = $1
        `;

        const result = await pool.query(userQuery, [mockFirebaseUser.uid]);
        
        console.log('Query result rows:', result.rows.length);
        
        if (result.rows.length === 0) {
            res.json({
                success: false,
                message: 'User not found in database',
                note: 'This is expected if user does not exist'
            });
            return;
        }

        const user = result.rows[0];
        console.log('User found:', user.email);

        res.json({
            success: true,
            message: 'Profile query successful',
            data: {
                firebase_uid: user.firebase_uid,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Profile query failed:', error);
        res.status(500).json({
            success: false,
            message: 'Profile query failed',
            error: error.message,
            stack: error.stack
        });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`🔧 Diagnostic server running on http://localhost:${PORT}`);
    console.log('📊 Test endpoints:');
    console.log('   - GET /test-db (test database connection)');
    console.log('   - GET /test-profile (test profile query)');
});
