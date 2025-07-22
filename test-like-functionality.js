// test-like-functionality.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

async function testLikeFunctionality() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing like functionality...');
    
    // Check if blogs table has like_count column
    const columnCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blogs' 
      AND column_name = 'like_count';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ like_count column missing from blogs table');
      return;
    }
    console.log('✅ like_count column exists in blogs table');
    
    // Check if blog_likes table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'blog_likes';
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ blog_likes table missing');
      return;
    }
    console.log('✅ blog_likes table exists');
    
    // Get all blogs with their current like counts
    const blogsResult = await client.query(`
      SELECT 
        b.id, 
        b.title, 
        b.like_count as stored_count,
        COALESCE(like_counts.actual_count, 0) as actual_count
      FROM blogs b
      LEFT JOIN (
        SELECT blog_id, COUNT(*) as actual_count 
        FROM blog_likes 
        GROUP BY blog_id
      ) like_counts ON b.id = like_counts.blog_id
      ORDER BY b.id;
    `);
    
    console.log('\n📊 Blog like counts:');
    console.log('ID | Title | Stored Count | Actual Count');
    console.log('---|-------|--------------|-------------');
    
    blogsResult.rows.forEach(blog => {
      const mismatch = blog.stored_count !== parseInt(blog.actual_count) ? ' ❌' : ' ✅';
      console.log(`${blog.id} | ${blog.title.substring(0, 20)}... | ${blog.stored_count} | ${blog.actual_count}${mismatch}`);
    });
    
    // Fix any mismatches
    console.log('\n🔧 Fixing like count mismatches...');
    await client.query(`
      UPDATE blogs 
      SET like_count = COALESCE(like_counts.actual_count, 0)
      FROM (
        SELECT blog_id, COUNT(*) as actual_count 
        FROM blog_likes 
        GROUP BY blog_id
      ) like_counts 
      WHERE blogs.id = like_counts.blog_id;
    `);
    
    // Set blogs with no likes to 0
    await client.query(`
      UPDATE blogs 
      SET like_count = 0 
      WHERE id NOT IN (
        SELECT DISTINCT blog_id FROM blog_likes
      );
    `);
    
    console.log('✅ Like counts synchronized');
    
    // Check triggers
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%blog%like%';
    `);
    
    console.log('\n⚡ Blog like triggers:');
    triggerCheck.rows.forEach(trigger => {
      console.log(`   • ${trigger.trigger_name} on ${trigger.event_object_table}`);
    });
    
    console.log('\n🎉 Like functionality test completed!');
    
  } catch (error) {
    console.error('❌ Error testing like functionality:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testLikeFunctionality();
