// scripts/check-enum.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

async function checkEnum() {
  try {
    console.log('🔍 Checking current user_role enum values...');
    
    const result = await pool.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumsortorder;
    `);
    
    console.log('📋 Current enum values:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.enumlabel}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking enum:', error.message);
  } finally {
    await pool.end();
  }
}

checkEnum();
