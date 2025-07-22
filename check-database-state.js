// check-database-state.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connected to database');
    
    // Check all tables
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);
    
    console.log('\n📋 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });
    
    // Check specifically for users table
    const usersCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (usersCheck.rows.length > 0) {
      console.log('\n✅ Users table exists with columns:');
      usersCheck.rows.forEach(row => {
        console.log(`   • ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('\n❌ Users table does not exist');
    }
    
    // Check if blog tables exist
    const blogTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'blog%'
      ORDER BY tablename;
    `);
    
    console.log('\n📝 Blog tables:');
    if (blogTablesResult.rows.length > 0) {
      blogTablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.tablename}`);
      });
    } else {
      console.log('   ❌ No blog tables found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkDatabase();
