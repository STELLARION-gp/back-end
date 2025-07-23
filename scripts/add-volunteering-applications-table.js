// scripts/add-volunteering-applications-table.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stellarion_db',
  password: process.env.DB_PASS || 'password',
  port: process.env.DB_PORT || 5432,
});

async function addVolunteeringApplicationsTable() {
  const client = await pool.connect();
  
  try {
    console.log('🗃️ Adding night camp volunteering applications table...');

    // Create the volunteering applications table
    const createTableQuery = `
      -- Night Camp Volunteering Applications table
      CREATE TABLE IF NOT EXISTS night_camp_volunteering_applications (
          id SERIAL PRIMARY KEY,
          night_camp_id INTEGER REFERENCES night_camps(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          volunteering_role VARCHAR(255) NOT NULL,
          motivation TEXT,
          experience TEXT,
          availability TEXT,
          emergency_contact_name VARCHAR(255),
          emergency_contact_phone VARCHAR(50),
          emergency_contact_relationship VARCHAR(100),
          status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
          application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at TIMESTAMP,
          review_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(night_camp_id, user_id, volunteering_role) -- Prevent duplicate applications for same role
      );
    `;

    await client.query(createTableQuery);

    // Create indexes for better performance
    const createIndexesQuery = `
      -- Index for volunteering applications
      CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_camp_id ON night_camp_volunteering_applications(night_camp_id);
      CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_user_id ON night_camp_volunteering_applications(user_id);
      CREATE INDEX IF NOT EXISTS idx_night_camp_volunteering_applications_status ON night_camp_volunteering_applications(status);
    `;

    await client.query(createIndexesQuery);

    // Create trigger for updated_at
    const createTriggerQuery = `
      -- Trigger for volunteering applications
      CREATE OR REPLACE TRIGGER update_night_camp_volunteering_applications_updated_at 
          BEFORE UPDATE ON night_camp_volunteering_applications 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column();
    `;

    await client.query(createTriggerQuery);

    console.log('✅ Night camp volunteering applications table created successfully!');
    
    // Verify the table exists
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'night_camp_volunteering_applications';
    `;
    
    const verifyResult = await client.query(verifyQuery);
    if (verifyResult.rows.length > 0) {
      console.log('✅ Table verification: night_camp_volunteering_applications exists');
      
      // Check table structure
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'night_camp_volunteering_applications'
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery);
      console.log('📋 Table structure:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } else {
      console.log('❌ Table verification failed: night_camp_volunteering_applications does not exist');
    }

  } catch (error) {
    console.error('❌ Error creating volunteering applications table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
addVolunteeringApplicationsTable()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });
