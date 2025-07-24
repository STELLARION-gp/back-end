const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function checkTableStructure() {
  try {
    console.log('Checking subscription_plans table structure...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscription_plans' 
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in subscription_plans table:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });

    console.log('\nGetting sample data...');
    const dataResult = await pool.query('SELECT * FROM subscription_plans LIMIT 1');
    if (dataResult.rows.length > 0) {
      console.log('\nSample record structure:');
      console.log(JSON.stringify(dataResult.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
