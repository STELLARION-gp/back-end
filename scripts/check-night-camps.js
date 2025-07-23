const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function checkNightCamps() {
  try {
    const result = await pool.query('SELECT id, name, organized_by, location, date FROM night_camps ORDER BY created_at DESC LIMIT 5');
    console.log('🏕️ Recent night camps in database:');
    console.log('='.repeat(60));
    
    if (result.rows.length === 0) {
      console.log('❌ No night camps found in database!');
    } else {
      result.rows.forEach(camp => {
        console.log(`📊 ID: ${camp.id} | Name: ${camp.name}`);
        console.log(`👤 Organizer: ${camp.organized_by || 'N/A'}`);
        console.log(`📍 Location: ${camp.location}`);
        console.log(`📅 Date: ${camp.date}`);
        console.log('-'.repeat(60));
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkNightCamps();
