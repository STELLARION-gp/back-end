// scripts/reset-database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Drop existing table and enum to start fresh
    const dropExisting = `
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
    `;
    
    await pool.query(dropExisting);
    console.log('✅ Existing database objects dropped!');
    
    // Create user roles enum
    const createEnum = `
      CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'learner', 'guide', 'enthusiast', 'mentor', 'influencer');
    `;
    
    await pool.query(createEnum);
    console.log('✅ User role enum created!');
    
    // Create users table with all columns
    const createUsersTable = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role user_role DEFAULT 'learner',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createUsersTable);
    console.log('✅ Users table created successfully!');
    
    // Create indexes for better performance
    const createIndexes = `
      CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_users_active ON users(is_active);
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
      CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await pool.query(createTrigger);
    console.log('✅ Update trigger created successfully!');
    
    // Insert default users for testing
    const insertDefaultUsers = `
      INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active) VALUES
        ('admin-firebase-uid', 'admin@gmail.com', 'admin', 'System', 'Administrator', true),
        ('moderator-firebase-uid', 'moderator@gmail.com', 'moderator', 'System', 'Moderator', true),
        ('mentor-firebase-uid', 'mentor@gmail.com', 'mentor', 'System', 'Mentor', true),
        ('influencer-firebase-uid', 'influencer@gmail.com', 'influencer', 'Test', 'Influencer', true),
        ('guide-firebase-uid', 'guide@gmail.com', 'guide', 'Test', 'Guide', true),
        ('enthusiast-firebase-uid', 'enthusiast@gmail.com', 'enthusiast', 'Test', 'Enthusiast', true),
        ('learner-firebase-uid', 'learner@gmail.com', 'learner', 'Test', 'Learner', true);
    `;
    
    await pool.query(insertDefaultUsers);
    console.log('✅ Default users inserted successfully!');
    
    // Test the connection and table
    const testQuery = await pool.query('SELECT COUNT(*) FROM users;');
    console.log(`📊 Users table is ready! Current count: ${testQuery.rows[0].count}`);
    
    console.log('🎉 Database reset and setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await pool.end();
    console.log('🔚 Database connection closed.');
  }
}

resetDatabase();
