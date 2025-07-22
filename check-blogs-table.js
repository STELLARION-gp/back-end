// check-blogs-table.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function checkBlogsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connected to database');
    
    // Check blogs table structure
    const blogsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'blogs' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Blogs table columns:');
    blogsResult.rows.forEach(row => {
      console.log(`   • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check if published_at column exists
    const publishedAtExists = blogsResult.rows.some(row => row.column_name === 'published_at');
    console.log(`\n📅 Published_at column exists: ${publishedAtExists ? '✅ YES' : '❌ NO'}`);
    
    // Check indexes on blogs table
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'blogs' 
      AND schemaname = 'public'
      ORDER BY indexname;
    `);
    
    console.log('\n📇 Indexes on blogs table:');
    indexResult.rows.forEach(row => {
      console.log(`   • ${row.indexname}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkBlogsTable();
