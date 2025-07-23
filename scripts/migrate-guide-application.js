// scripts/migrate-guide-application.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stellarion_db',
  password: process.env.DB_PASS || 'password',
  port: process.env.DB_PORT || 5432,
});

async function migrateGuideApplication() {
  try {
    console.log('🔄 Starting guide application table migration...');

    // First, let's check if the table exists and has the old structure
    const tableCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'guide_application' 
      ORDER BY ordinal_position;
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Guide application table does not exist. Please run the main schema setup first.');
      return;
    }

    console.log('📋 Current table structure:');
    tableCheck.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });

    // Drop the existing table (since we're restructuring completely)
    console.log('🗑️ Dropping existing guide_application table...');
    await pool.query('DROP TABLE IF EXISTS guide_application CASCADE;');

    // Create the new enhanced guide application table
    console.log('🏗️ Creating new guide application table...');
    await pool.query(`
      -- Guide Application Table (Enhanced for comprehensive guide application)
      CREATE TABLE IF NOT EXISTS guide_application (
          application_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          -- Personal Information
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL,
          date_of_birth DATE,
          address TEXT,
          city VARCHAR(100),
          
          -- Professional Background
          current_occupation VARCHAR(255),
          education_level VARCHAR(100),
          astronomy_education TEXT,
          guide_experience TEXT,
          total_experience INTEGER DEFAULT 0,
          
          -- Certifications & Skills
          certifications JSONB DEFAULT '[]',
          astronomy_skills JSONB DEFAULT '[]',
          languages JSONB DEFAULT '[]',
          first_aid BOOLEAN DEFAULT FALSE,
          driving_license BOOLEAN DEFAULT FALSE,
          
          -- Camp-Specific Experience
          camp_types JSONB DEFAULT '[]',
          group_sizes JSONB DEFAULT '[]',
          equipment_familiarity JSONB DEFAULT '[]',
          outdoor_experience TEXT,
          
          -- Availability & Preferences
          available_dates JSONB DEFAULT '[]',
          preferred_locations JSONB DEFAULT '[]',
          accommodation_needs TEXT,
          transportation_needs TEXT,
          
          -- Additional Information
          motivation TEXT,
          special_skills TEXT,
          emergency_contact JSONB DEFAULT '{}',
          
          -- Documents (Firebase Storage URLs)
          documents JSONB DEFAULT '{}',
          
          -- Selected Camps
          selected_camps JSONB DEFAULT '[]',
          
          -- Application Status
          application_status application_status DEFAULT 'pending',
          approve_application_status approve_application_status DEFAULT 'pending',
          
          -- Agreement
          terms_accepted BOOLEAN DEFAULT FALSE,
          background_check_consent BOOLEAN DEFAULT FALSE,
          
          -- System fields
          deletion_status BOOLEAN DEFAULT FALSE,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create trigger for updated_at
    console.log('⚙️ Creating trigger for updated_at...');
    await pool.query(`
      CREATE TRIGGER update_guide_application_updated_at
          BEFORE UPDATE ON guide_application
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Auto-fill name/email from users table for guide on insert
    console.log('⚙️ Creating autofill trigger...');
    await pool.query(`
      CREATE TRIGGER autofill_guide_user_info
          BEFORE INSERT ON guide_application
          FOR EACH ROW
          EXECUTE FUNCTION autofill_user_info();
    `);

    // Create indexes for better performance
    console.log('📊 Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_guide_application_user_id ON guide_application(user_id);
      CREATE INDEX IF NOT EXISTS idx_guide_application_status ON guide_application(application_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_approve_status ON guide_application(approve_application_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_deletion_status ON guide_application(deletion_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_submitted_at ON guide_application(submitted_at);
    `);

    // Check the new table structure
    const newTableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'guide_application' 
      ORDER BY ordinal_position;
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📋 New table structure:');
    newTableCheck.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });

    console.log('\n🎉 Guide application table migration completed!');
    console.log('📝 New features added:');
    console.log('   - Comprehensive personal information fields');
    console.log('   - Professional background tracking');
    console.log('   - Detailed certifications and skills');
    console.log('   - Camp-specific experience fields');
    console.log('   - Availability and preferences');
    console.log('   - Document upload support (Firebase URLs)');
    console.log('   - Emergency contact information');
    console.log('   - Terms acceptance and background check consent');
    console.log('   - Selected camps tracking');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateGuideApplication();
}

module.exports = migrateGuideApplication;
