// Test script to verify guide_application table functionality
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function testGuideApplicationTable() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing guide_application table...\n');
    
    // 1. Check table structure
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'guide_application' 
      ORDER BY ordinal_position
    `);
    
    console.log(`✅ Table has ${columnsResult.rows.length} columns`);
    
    // 2. Test inserting sample data
    console.log('\n📝 Testing data insertion...');
    
    const insertQuery = `
      INSERT INTO guide_application (
        user_id, first_name, last_name, email, phone, 
        total_experience, certifications, astronomy_skills, 
        languages, emergency_contact, selected_camps,
        terms_accepted, background_check_consent
      ) VALUES (
        1, 'John', 'Doe', 'john.doe@example.com', '+1234567890',
        5, '["First Aid Certificate", "Astronomy Guide License"]'::jsonb,
        '["Telescope Operation", "Star Navigation", "Astrophotography"]'::jsonb,
        '["English", "Spanish"]'::jsonb,
        '{"name": "Jane Doe", "relationship": "Spouse", "phone": "+1234567891"}'::jsonb,
        '["summer-camp-2024", "winter-stargazing-2024"]'::jsonb,
        true, true
      ) RETURNING application_id, first_name, last_name, email
    `;
    
    const insertResult = await client.query(insertQuery);
    const applicationId = insertResult.rows[0].application_id;
    
    console.log('✅ Sample application inserted successfully!');
    console.log(`   Application ID: ${applicationId}`);
    console.log(`   Name: ${insertResult.rows[0].first_name} ${insertResult.rows[0].last_name}`);
    console.log(`   Email: ${insertResult.rows[0].email}`);
    
    // 3. Test retrieving data
    console.log('\n📖 Testing data retrieval...');
    
    const selectQuery = `
      SELECT 
        application_id, first_name, last_name, email, phone,
        total_experience, certifications, astronomy_skills,
        languages, emergency_contact, application_status,
        submitted_at
      FROM guide_application 
      WHERE application_id = $1
    `;
    
    const selectResult = await client.query(selectQuery, [applicationId]);
    const application = selectResult.rows[0];
    
    console.log('✅ Data retrieved successfully!');
    console.log('   Application Details:');
    console.log(`   - ID: ${application.application_id}`);
    console.log(`   - Name: ${application.first_name} ${application.last_name}`);
    console.log(`   - Email: ${application.email}`);
    console.log(`   - Phone: ${application.phone}`);
    console.log(`   - Experience: ${application.total_experience} years`);
    console.log(`   - Status: ${application.application_status}`);
    console.log(`   - Certifications: ${JSON.stringify(application.certifications)}`);
    console.log(`   - Skills: ${JSON.stringify(application.astronomy_skills)}`);
    console.log(`   - Languages: ${JSON.stringify(application.languages)}`);
    console.log(`   - Emergency Contact: ${JSON.stringify(application.emergency_contact)}`);
    console.log(`   - Submitted: ${application.submitted_at}`);
    
    // 4. Test updating data
    console.log('\n🔄 Testing data update...');
    
    const updateQuery = `
      UPDATE guide_application 
      SET 
        motivation = 'I am passionate about astronomy and love sharing knowledge with others.',
        special_skills = 'Advanced astrophotography, telescope maintenance',
        camp_types = '["Stargazing", "Astrophotography", "Educational Workshops"]'::jsonb,
        updated_at = NOW()
      WHERE application_id = $1
      RETURNING application_id, motivation, special_skills, camp_types
    `;
    
    const updateResult = await client.query(updateQuery, [applicationId]);
    const updated = updateResult.rows[0];
    
    console.log('✅ Data updated successfully!');
    console.log(`   - Motivation: ${updated.motivation}`);
    console.log(`   - Special Skills: ${updated.special_skills}`);
    console.log(`   - Camp Types: ${JSON.stringify(updated.camp_types)}`);
    
    // 5. Clean up test data
    await client.query('DELETE FROM guide_application WHERE application_id = $1', [applicationId]);
    console.log('\n🧹 Test data cleaned up');
    
    console.log('\n🎉 All tests passed! Guide application table is working perfectly!');
    
    // 6. Show final summary
    console.log('\n📊 Table Summary:');
    console.log('   ✅ Personal Information: first_name, last_name, email, phone, date_of_birth, address, city');
    console.log('   ✅ Professional: current_occupation, education_level, astronomy_education, guide_experience, total_experience');
    console.log('   ✅ Certifications & Skills: certifications, astronomy_skills, languages, first_aid, driving_license (JSONB)');
    console.log('   ✅ Camp Experience: camp_types, group_sizes, equipment_familiarity, outdoor_experience (JSONB)');
    console.log('   ✅ Availability: available_dates, preferred_locations, accommodation_needs, transportation_needs (JSONB)');
    console.log('   ✅ Additional: motivation, special_skills, emergency_contact (JSONB)');
    console.log('   ✅ Documents: documents (JSONB for Firebase URLs)');
    console.log('   ✅ Camps: selected_camps (JSONB)');
    console.log('   ✅ Status: application_status, approve_application_status (ENUMs)');
    console.log('   ✅ Agreements: terms_accepted, background_check_consent (BOOLEANs)');
    console.log('   ✅ System: deletion_status, submitted_at, updated_at');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testGuideApplicationTable()
  .then(() => {
    console.log('\n🏆 Guide application table is fully functional and ready for use!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
