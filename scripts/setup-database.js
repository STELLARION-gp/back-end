// scripts/setup-database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

async function setupDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Create users table
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createUsersTable);
    console.log('✅ Users table created successfully!');
    
    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;
    
    await pool.query(createIndexes);
    console.log('✅ Database indexes created successfully!');
    
    // Create update trigger function
    const createUpdateFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `;
    
    await pool.query(createUpdateFunction);
    console.log('✅ Update function created successfully!');
    
    // Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTrigger);
    console.log('✅ Update trigger created successfully!');
    
    // Test the connection and table
    const testQuery = await pool.query('SELECT COUNT(*) FROM users;');
    console.log(`📊 Users table is ready! Current count: ${testQuery.rows[0].count}`);
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed.');
  }
}

setupDatabase();
