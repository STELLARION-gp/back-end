const { Pool } = require('pg');

const pool = new Pool({
  host: '134.209.158.95',
  user: 'postgres',
  password: 'stellarion2022',
  database: 'stellarion',
  port: 5432
});

// Function to register a test user
async function registerTestUser() {
  const testUser = {
    firebase_uid: 'test-user-blog-001',
    email: 'blogtest@example.com',
    first_name: 'Blog',
    last_name: 'Tester',
    display_name: 'Blog Test User',
    role: 'influencer'
  };

  try {
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, first_name, last_name, display_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, true) 
       ON CONFLICT (firebase_uid) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name
       RETURNING *`,
      [testUser.firebase_uid, testUser.email, testUser.first_name, testUser.last_name, testUser.display_name, testUser.role]
    );
    
    console.log('Test user registered:', result.rows[0]);
  } catch (error) {
    console.error('Error registering test user:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the registration
registerTestUser();
