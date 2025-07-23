// Check user roles in database
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function checkUserRoles() {
  try {
    console.log('🔍 Checking user roles in database...');
    
    // Get all users with their roles
    const usersQuery = `
      SELECT firebase_uid, email, role, first_name, last_name, display_name, is_active 
      FROM users 
      ORDER BY role, email
    `;
    
    const result = await pool.query(usersQuery);
    
    console.log('\n📊 Users in database:');
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    result.rows.forEach(user => {
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log(`👤 Name: ${user.display_name || `${user.first_name} ${user.last_name}`.trim() || 'N/A'}`);
      console.log(`🔑 Firebase UID: ${user.firebase_uid}`);
      console.log(`✅ Active: ${user.is_active}`);
      console.log('-'.repeat(80));
    });
    
    // Check moderators and admins specifically
    const moderatorsQuery = `
      SELECT COUNT(*) as count FROM users 
      WHERE role IN ('moderator', 'admin') AND is_active = true
    `;
    
    const moderatorResult = await pool.query(moderatorsQuery);
    const moderatorCount = moderatorResult.rows[0].count;
    
    console.log(`\n🛡️ Active moderators/admins: ${moderatorCount}`);
    
    if (moderatorCount === 0) {
      console.log('\n⚠️  WARNING: No active moderators or admins found!');
      console.log('💡 Consider creating a moderator user for testing.');
    }
    
  } catch (error) {
    console.error('❌ Error checking user roles:', error);
  } finally {
    await pool.end();
  }
}

checkUserRoles();
