#!/usr/bin/env node

/**
 * Comprehensive Backend Diagnostic Test
 * Tests all potential issues causing the 500 Internal Server Error
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🔧 Starting Backend Diagnostic Test...\n');

// Test 1: Basic Express Setup
console.log('1. Testing Express setup...');
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
console.log('✅ Express setup successful');

// Test 2: Database Connection
console.log('\n2. Testing database connection...');
let pool;
try {
    pool = require('./db.js').default;
    console.log('✅ Database pool created');
} catch (error) {
    console.log('❌ Database pool creation failed:', error.message);
    process.exit(1);
}

// Test 3: Firebase Admin
console.log('\n3. Testing Firebase Admin...');
let admin;
try {
    admin = require('./firebaseAdmin.js').default;
    console.log('✅ Firebase Admin loaded');
} catch (error) {
    console.log('❌ Firebase Admin loading failed:', error.message);
    process.exit(1);
}

// Test 4: Create test endpoint that mimics profile controller
app.get('/test-profile-endpoint', async (req, res) => {
    try {
        console.log('📡 Test profile endpoint called');
        
        // Mock Firebase user (this is what verifyToken middleware should provide)
        const mockFirebaseUser = {
            uid: 'test-uid-12345',
            email: 'test@example.com',
            firebase_uid: 'test-uid-12345'
        };

        console.log('🔍 Mock Firebase UID:', mockFirebaseUser.uid);

        // Test database query (same as profile controller)
        const userQuery = `
            SELECT u.*, s.language, s.email_notifications, s.push_notifications, 
                   s.profile_visibility, s.allow_direct_messages, s.show_online_status, 
                   s.theme, s.timezone
            FROM users u
            LEFT JOIN user_settings s ON u.id = s.user_id
            WHERE u.firebase_uid = $1
        `;

        console.log('🔍 Running database query...');
        const result = await pool.query(userQuery, [mockFirebaseUser.uid]);
        console.log('✅ Database query successful, rows:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('⚠️ User not found (expected for test UID)');
            
            // Test auto-create logic
            console.log('🔧 Testing user auto-creation...');
            
            const email = mockFirebaseUser.email;
            const displayName = email.split('@')[0];
            
            const createResult = await pool.query(
                `INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login, created_at, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
                 RETURNING *`,
                [mockFirebaseUser.uid, email, 'learner', 'Test', 'User', displayName]
            );

            console.log('✅ User created successfully');

            // Create default settings
            await pool.query(
                `INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
                 VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`,
                [createResult.rows[0].id]
            );

            console.log('✅ User settings created successfully');

            // Query again
            const newResult = await pool.query(userQuery, [mockFirebaseUser.uid]);
            console.log('✅ Re-query successful, rows:', newResult.rows.length);
        }

        res.json({
            success: true,
            message: 'Profile endpoint test successful',
            mockUser: mockFirebaseUser,
            queryResults: result.rows.length
        });

    } catch (error) {
        console.error('❌ Test profile endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            stack: error.stack
        });
    }
});

// Test 5: Database connectivity test
app.get('/test-db', async (req, res) => {
    try {
        console.log('📡 Database test endpoint called');
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        console.log('✅ Database query successful');
        res.json({
            success: true,
            message: 'Database connection successful',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Database test error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Test 6: Start server
const PORT = 5000;
const server = app.listen(PORT, () => {
    console.log(`\n🚀 Diagnostic server running on http://localhost:${PORT}`);
    console.log('📊 Test endpoints:');
    console.log('   - GET /test-db (database connection)');
    console.log('   - GET /test-profile-endpoint (profile logic)');
    console.log('\n🔍 Run these tests in your browser or with curl:');
    console.log(`   curl http://localhost:${PORT}/test-db`);
    console.log(`   curl http://localhost:${PORT}/test-profile-endpoint`);
    console.log('\n⏰ Server will run for 2 minutes, then exit automatically...');
    
    // Auto-exit after 2 minutes
    setTimeout(() => {
        console.log('\n⏰ 2 minutes elapsed, shutting down...');
        server.close();
        process.exit(0);
    }, 120000);
});

// Handle errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});
