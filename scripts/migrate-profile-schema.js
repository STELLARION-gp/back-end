// scripts/migrate-profile-schema.js
// Database migration script to add profile features to existing databases

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'backend_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  console.log('🔄 Starting profile schema migration...');
  
  try {
    // Check if migration is needed by looking for new columns
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('first_name', 'profile_data', 'role_specific_data')
    `);

    if (checkColumns.rows.length === 3) {
      console.log('✅ Profile schema already migrated!');
      return;
    }

    console.log('📝 Adding new columns to users table...');
    
    // Add new columns to users table (using ALTER TABLE ADD COLUMN IF NOT EXISTS for safety)
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(50),
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'learner',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
      ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS role_specific_data JSONB DEFAULT '{}'
    `);

    console.log('📊 Creating new indexes...');
    
    // Create new indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_profile_data ON users USING GIN (profile_data);
      CREATE INDEX IF NOT EXISTS idx_users_role_specific_data ON users USING GIN (role_specific_data);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
    `);

    console.log('🔧 Creating user_settings table...');
    
    // Create user_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(10) DEFAULT 'en',
        email_notifications BOOLEAN DEFAULT true,
        push_notifications BOOLEAN DEFAULT true,
        profile_visibility VARCHAR(20) DEFAULT 'public',
        allow_direct_messages BOOLEAN DEFAULT true,
        show_online_status BOOLEAN DEFAULT true,
        theme VARCHAR(10) DEFAULT 'dark',
        timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    console.log('🚀 Creating role_upgrade_requests table...');
    
    // Create role_upgrade_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_upgrade_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        current_role VARCHAR(20) NOT NULL,
        requested_role VARCHAR(20) NOT NULL,
        reason TEXT,
        supporting_evidence JSONB,
        status VARCHAR(20) DEFAULT 'pending',
        reviewer_id INTEGER REFERENCES users(id),
        reviewer_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON role_upgrade_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_upgrade_requests(status);
    `);

    console.log('📷 Creating user_avatars table...');
    
    // Create user_avatars table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_avatars (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        file_path VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_avatars_active ON user_avatars(user_id) WHERE is_active = true
    `);

    console.log('⚙️  Creating triggers and functions...');
    
    // Create triggers for user_settings
    await pool.query(`
      CREATE TRIGGER IF NOT EXISTS update_user_settings_updated_at 
        BEFORE UPDATE ON user_settings 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create function to auto-create settings for new users
    await pool.query(`
      CREATE OR REPLACE FUNCTION create_default_user_settings()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO user_settings (user_id) VALUES (NEW.id);
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS create_user_settings_trigger ON users;
      CREATE TRIGGER create_user_settings_trigger
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION create_default_user_settings()
    `);

    console.log('👥 Creating default settings for existing users...');
    
    // Create default settings for existing users
    await pool.query(`
      INSERT INTO user_settings (user_id)
      SELECT id FROM users 
      WHERE id NOT IN (SELECT user_id FROM user_settings)
    `);

    console.log('✅ Profile schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('🎉 Migration finished!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
