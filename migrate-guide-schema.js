const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function migrateSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Starting guide_application table migration...');
    
    // Drop and recreate the guide_application table with new structure
    const migrationSQL = `
      -- Drop existing table if it exists
      DROP TABLE IF EXISTS guide_application CASCADE;
      
      -- Create the new guide_application table
      CREATE TABLE guide_application (
          application_id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          
          -- Personal Information
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          date_of_birth DATE,
          address TEXT,
          city VARCHAR(100),
          
          -- Professional Background
          current_occupation VARCHAR(255),
          education_level VARCHAR(255),
          astronomy_education TEXT,
          guide_experience TEXT,
          total_experience INTEGER NOT NULL DEFAULT 0,
          
          -- Certifications & Skills (JSONB arrays)
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
          emergency_contact JSONB NOT NULL DEFAULT '{}',
          
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
          submitted_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
      
      -- Create indexes for better performance
      CREATE INDEX idx_guide_app_user_id ON guide_application(user_id);
      CREATE INDEX idx_guide_app_status ON guide_application(application_status);
      CREATE INDEX idx_guide_app_approve_status ON guide_application(approve_application_status);
      CREATE INDEX idx_guide_app_submitted_at ON guide_application(submitted_at);
    `;
    
    await client.query(migrationSQL);
    
    console.log('✅ Guide application table migration completed successfully!');
    console.log('📋 New table structure:');
    console.log('   - Personal Information (first_name, last_name, email, phone, etc.)');
    console.log('   - Professional Background (occupation, education, experience)');
    console.log('   - Certifications & Skills (JSONB arrays)');
    console.log('   - Camp Experience (types, sizes, equipment)');
    console.log('   - Availability & Preferences');
    console.log('   - Documents (Firebase URLs)');
    console.log('   - Application Status & Agreements');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateSchema()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
