// scripts/add-new-tables.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stellarion',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
});

async function addNewTables() {
  try {
    console.log('🔄 Adding new tables...');

    // Add display_name column to users table if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
    `);

    // Add profile_data column to users table if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}';
    `);

    // Add role_specific_data column to users table if it doesn't exist
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role_specific_data JSONB DEFAULT '{}';
    `);

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
      );
    `);

    // Create role_upgrade_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_upgrade_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        current_user_role VARCHAR(20) NOT NULL,
        requested_user_role VARCHAR(20) NOT NULL,
        reason TEXT,
        supporting_evidence JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending',
        reviewer_id INTEGER REFERENCES users(id),
        reviewer_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP
      );
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_user_id ON role_upgrade_requests(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_status ON role_upgrade_requests(status);
    `);

    // Create trigger for user_settings updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
    `);

    await pool.query(`
      CREATE TRIGGER update_user_settings_updated_at 
        BEFORE UPDATE ON user_settings 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    // Insert default settings for existing users
    await pool.query(`
      INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone)
      SELECT id, 'en', true, true, 'public', true, true, 'dark', 'UTC'
      FROM users
      WHERE id NOT IN (SELECT user_id FROM user_settings WHERE user_id IS NOT NULL);
    `);

    // Update existing users with display_name if null
    await pool.query(`
      UPDATE users 
      SET display_name = COALESCE(
        CASE 
          WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
          WHEN first_name IS NOT NULL THEN first_name
          WHEN last_name IS NOT NULL THEN last_name
          ELSE SPLIT_PART(email, '@', 1)
        END
      )
      WHERE display_name IS NULL;
    `);

    // Check results
    const userSettingsCount = await pool.query('SELECT COUNT(*) FROM user_settings');
    const roleRequestsCount = await pool.query('SELECT COUNT(*) FROM role_upgrade_requests');
    const usersCount = await pool.query('SELECT COUNT(*) FROM users');

    console.log('✅ New tables added successfully!');
    console.log(`📊 Database statistics:`);
    console.log(`   Users: ${usersCount.rows[0].count}`);
    console.log(`   User Settings: ${userSettingsCount.rows[0].count}`);
    console.log(`   Role Upgrade Requests: ${roleRequestsCount.rows[0].count}`);

    console.log('\n🎉 Database extended successfully!');
    console.log('📋 New features added:');
    console.log('   - Extended user profiles with profile_data and role_specific_data');
    console.log('   - User settings management');
    console.log('   - Role upgrade request system');
    console.log('   - Display name support');

  } catch (error) {
    console.error('❌ Error adding new tables:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
addNewTables();
