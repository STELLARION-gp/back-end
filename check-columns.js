const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'stellarion_db',
  password: 'password',
  port: 5432,
});

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blogs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('All columns in blogs table:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
    
    pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    pool.end();
  }
}

checkColumns();
