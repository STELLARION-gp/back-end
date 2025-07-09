// scripts/check-database.js
const { Pool } = require('pg');
require('dotenv').config();

async function checkDatabase() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: parseInt(process.env.DB_PORT || "5432"),
  });

  try {
    console.log('🔍 Checking database connection and users table...');
    console.log('='.repeat(60));

    // Test database connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ Users table exists');
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table structure:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable} - Default: ${col.column_default || 'none'}`);
      });
      
      // Check user count
      const countResult = await client.query('SELECT COUNT(*) FROM users');
      const userCount = countResult.rows[0].count;
      console.log(`\n👥 Users in database: ${userCount}`);
      
      // Show sample users
      const usersResult = await client.query(`
        SELECT firebase_uid, email, display_name, role, is_active, created_at, last_login 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\n📝 Sample users:');
      if (usersResult.rows.length > 0) {
        usersResult.rows.forEach(user => {
          console.log(`  - ${user.display_name || user.email} (${user.email})`);
          console.log(`    Role: ${user.role}, Active: ${user.is_active}`);
          console.log(`    Firebase UID: ${user.firebase_uid}`);
          console.log(`    Created: ${user.created_at}`);
          console.log(`    Last Login: ${user.last_login || 'Never'}`);
          console.log('    ---');
        });
      } else {
        console.log('  No users found in database');
      }
      
      // Check user_settings table
      const settingsTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_settings'
        );
      `);
      
      if (settingsTableCheck.rows[0].exists) {
        console.log('\n✅ User_settings table exists');
        const settingsCount = await client.query('SELECT COUNT(*) FROM user_settings');
        console.log(`👥 User settings records: ${settingsCount.rows[0].count}`);
      } else {
        console.log('\n❌ User_settings table does not exist');
      }
      
      // Check role_upgrade_requests table
      const roleTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'role_upgrade_requests'
        );
      `);
      
      if (roleTableCheck.rows[0].exists) {
        console.log('✅ Role_upgrade_requests table exists');
        const roleCount = await client.query('SELECT COUNT(*) FROM role_upgrade_requests');
        console.log(`📊 Role upgrade requests: ${roleCount.rows[0].count}`);
      } else {
        console.log('❌ Role_upgrade_requests table does not exist');
      }
      
    } else {
      console.log('❌ Users table does not exist!');
      console.log('Backend needs to create users table and migrate data');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Connection details:', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      port: process.env.DB_PORT
    });
  } finally {
    await pool.end();
  }
}

console.log('🔍 STELLARION Database Check');
console.log('='.repeat(60));
checkDatabase().catch(console.error);
