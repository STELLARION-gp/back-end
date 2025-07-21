const { Pool } = require('pg');

const pool = new Pool({
  host: '134.209.158.95',
  user: 'postgres',
  password: 'stellarion2022',
  database: 'stellarion',
  port: 5432
});

async function checkBlogTable() {
  try {
    // Check if blogs table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'blogs'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('Blogs table does not exist');
      return;
    }
    
    // Get table structure
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'blogs' 
      ORDER BY ordinal_position
    `);
    
    console.log('Blog table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBlogTable();
