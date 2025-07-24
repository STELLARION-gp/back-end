// scripts/setup-blog-schema.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function setupBlogSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connecting to database...');
    
    // Read the blog schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'blog_schema.sql');
    const blogSchema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Reading blog_schema.sql...');
    
    // Execute the blog schema
    console.log('🏗️  Creating blog tables and functions...');
    await client.query(blogSchema);
    
    console.log('✅ Blog schema setup completed successfully!');
    
    // Verify tables were created
    console.log('🔍 Verifying blog tables...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'blog%'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    console.log('📋 Blog tables created:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check indexes
    const indexQuery = `
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%blog%'
      ORDER BY indexname;
    `;
    
    const indexResult = await client.query(indexQuery);
    console.log('📇 Blog indexes created:');
    indexResult.rows.forEach(row => {
      console.log(`   ✓ ${row.indexname}`);
    });
    
    // Check triggers
    const triggerQuery = `
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE event_object_schema = 'public' 
      AND (event_object_table LIKE 'blog%' OR trigger_name LIKE '%blog%')
      ORDER BY trigger_name;
    `;
    
    const triggerResult = await client.query(triggerQuery);
    console.log('⚡ Blog triggers created:');
    triggerResult.rows.forEach(row => {
      console.log(`   ✓ ${row.trigger_name} on ${row.event_object_table}`);
    });
    
    console.log('\n🎉 Blog schema setup completed successfully!');
    console.log('   All tables, indexes, and triggers are ready.');
    
  } catch (error) {
    console.error('❌ Error setting up blog schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
if (require.main === module) {
  setupBlogSchema()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupBlogSchema };
