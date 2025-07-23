// scripts/setup-application-tables.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
});

async function setupApplicationTables() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Create the application status enums first
    console.log('🔧 Creating application status enums...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE approve_application_status AS ENUM ('pending', 'accepted', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE session_format AS ENUM ('Live', 'Recorded', 'Hybrid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('Bank', 'e-wallet', 'PayPal', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create mentor application table
    console.log('🏗️ Creating mentor application table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mentor_application (
          application_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          email VARCHAR(255),
          phone_number VARCHAR(50),
          date_of_birth DATE,
          country VARCHAR(100),
          profile_bio TEXT,
          educational_background TEXT,
          area_of_expertise JSONB,
          linkedin_profile VARCHAR(255),
          intro_video_url VARCHAR(255),
          max_mentees INT,
          availability_schedule JSONB,
          motivation_statement TEXT,
          portfolio_attachments JSONB,
          application_status application_status DEFAULT 'pending',
          approve_application_status approve_application_status DEFAULT 'pending',
          deletion_status BOOLEAN DEFAULT FALSE,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create influencer application table
    console.log('🏗️ Creating influencer application table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS influencer_application (
          application_id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          email VARCHAR(255),
          phone_number VARCHAR(50),
          country VARCHAR(100),
          bio TEXT,
          specialization_tags JSONB,
          social_links JSONB,
          intro_video_url VARCHAR(255),
          sample_content_links JSONB,
          preferred_session_format session_format,
          willing_to_host_sessions BOOLEAN,
          tools_used JSONB,
          application_status application_status DEFAULT 'pending',
          approve_application_status approve_application_status DEFAULT 'pending',
          deletion_status BOOLEAN DEFAULT FALSE,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create the enhanced guide application table
    console.log('🏗️ Creating enhanced guide application table...');
    await pool.query(`
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

    // Create triggers
    console.log('⚙️ Creating triggers...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION soft_delete_application() RETURNS TRIGGER AS $$
      BEGIN
          NEW.deletion_status := TRUE;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION autofill_user_info() RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.user_id IS NOT NULL THEN
              SELECT first_name, last_name, email INTO NEW.first_name, NEW.last_name, NEW.email FROM users WHERE id = NEW.user_id;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers for updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_mentor_application_updated_at ON mentor_application;
      CREATE TRIGGER update_mentor_application_updated_at
          BEFORE UPDATE ON mentor_application
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_influencer_application_updated_at ON influencer_application;
      CREATE TRIGGER update_influencer_application_updated_at
          BEFORE UPDATE ON influencer_application
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_guide_application_updated_at ON guide_application;
      CREATE TRIGGER update_guide_application_updated_at
          BEFORE UPDATE ON guide_application
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // Create autofill triggers for applications
    await pool.query(`
      DROP TRIGGER IF EXISTS autofill_mentor_user_info ON mentor_application;
      CREATE TRIGGER autofill_mentor_user_info
          BEFORE INSERT ON mentor_application
          FOR EACH ROW
          EXECUTE FUNCTION autofill_user_info();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS autofill_influencer_user_info ON influencer_application;
      CREATE TRIGGER autofill_influencer_user_info
          BEFORE INSERT ON influencer_application
          FOR EACH ROW
          EXECUTE FUNCTION autofill_user_info();
    `);

    // Note: Guide application doesn't use autofill since it has different field names

    // Create indexes
    console.log('📊 Creating indexes...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mentor_application_user_id ON mentor_application(user_id);
      CREATE INDEX IF NOT EXISTS idx_mentor_application_status ON mentor_application(application_status);
      CREATE INDEX IF NOT EXISTS idx_mentor_application_deletion_status ON mentor_application(deletion_status);
      
      CREATE INDEX IF NOT EXISTS idx_influencer_application_user_id ON influencer_application(user_id);
      CREATE INDEX IF NOT EXISTS idx_influencer_application_status ON influencer_application(application_status);
      CREATE INDEX IF NOT EXISTS idx_influencer_application_deletion_status ON influencer_application(deletion_status);
      
      CREATE INDEX IF NOT EXISTS idx_guide_application_user_id ON guide_application(user_id);
      CREATE INDEX IF NOT EXISTS idx_guide_application_status ON guide_application(application_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_approve_status ON guide_application(approve_application_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_deletion_status ON guide_application(deletion_status);
      CREATE INDEX IF NOT EXISTS idx_guide_application_submitted_at ON guide_application(submitted_at);
    `);

    // Check created tables
    const tables = ['mentor_application', 'influencer_application', 'guide_application'];
    for (const table of tables) {
      const result = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = $1
      `, [table]);
      
      if (result.rows[0].count > 0) {
        console.log(`✅ ${table} table created successfully`);
      } else {
        console.log(`❌ Failed to create ${table} table`);
      }
    }

    console.log('\n🎉 Application tables setup completed successfully!');
    console.log('📝 Created tables:');
    console.log('   - mentor_application');
    console.log('   - influencer_application'); 
    console.log('   - guide_application (enhanced for comprehensive applications)');
    console.log('\n⚙️ Created triggers and functions:');
    console.log('   - Auto-update timestamps');
    console.log('   - User info autofill');
    console.log('   - Soft delete support');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupApplicationTables();
}

module.exports = setupApplicationTables;
