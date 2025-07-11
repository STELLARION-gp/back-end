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
    
    // Create user roles enum and users table
    const createUsersTable = `
      -- Create user roles enum
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
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
    
    // Add new columns and indexes if they don't exist
    const addColumnsAndIndexes = `
      -- Add role column if it doesn't exist
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
          ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
          ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
          ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_active') THEN
          ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        END IF;
      END $$;
      
      -- Create additional indexes
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
    `;
    
    await pool.query(addColumnsAndIndexes);
    console.log('✅ Additional columns and indexes created successfully!');
    
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
    
    // Insert default users for testing
    const insertDefaultUsers = `
      INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active) VALUES
        ('admin-firebase-uid', 'admin@gmail.com', 'admin', 'System', 'Administrator', true),
        ('moderator-firebase-uid', 'moderator@gmail.com', 'moderator', 'System', 'Moderator', true),
        ('learner-firebase-uid', 'learner@gmail.com', 'learner', 'Test', 'Learner', true),
        ('guide-firebase-uid', 'guide@gmail.com', 'guide', 'Test', 'Guide', true),
        ('enthusiast-firebase-uid', 'enthusiast@gmail.com', 'enthusiast', 'Test', 'Enthusiast', true),
        ('mentor-firebase-uid', 'mentor@gmail.com', 'mentor', 'Test', 'Mentor', true),
        ('influencer-firebase-uid', 'influencer@gmail.com', 'influencer', 'Test', 'Influencer', true)
      ON CONFLICT (email) DO NOTHING;
    `;
    
    await pool.query(insertDefaultUsers);
    console.log('✅ Default users inserted successfully!');
    
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
