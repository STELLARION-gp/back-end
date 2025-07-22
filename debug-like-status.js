const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'stellarion',
  password: 'stellarion2022',
  port: 5432,
});

async function debugLikeStatus() {
  try {
    console.log('=== DEBUGGING LIKE STATUS ===\n');
    
    // Get all blogs with their like information
    const blogsQuery = `
      SELECT 
        b.id,
        b.title,
        b.author_id,
        b.author_name,
        b.author_display_name,
        b.author_email,
        COUNT(bl.id) as actual_like_count,
        b.like_count as stored_like_count
      FROM blogs b
      LEFT JOIN blog_likes bl ON b.id = bl.blog_id
      GROUP BY b.id, b.title, b.author_id, b.author_name, b.author_display_name, b.author_email, b.like_count
      ORDER BY b.id;
    `;
    
    const blogsResult = await pool.query(blogsQuery);
    
    console.log('📚 BLOGS AND LIKE COUNTS:');
    console.log('=========================');
    for (const blog of blogsResult.rows) {
      console.log(`Blog ID: ${blog.id}`);
      console.log(`Title: ${blog.title}`);
      console.log(`Author: ${blog.author_name || blog.author_display_name || 'Unknown'}`);
      console.log(`Stored Like Count: ${blog.stored_like_count}`);
      console.log(`Actual Like Count: ${blog.actual_like_count}`);
      console.log('---');
    }
    
    // Get all individual likes
    console.log('\n👍 INDIVIDUAL LIKES:');
    console.log('====================');
    const likesQuery = `
      SELECT 
        bl.id,
        bl.blog_id,
        bl.user_id,
        bl.user_firebase_uid,
        bl.user_name,
        bl.user_display_name,
        bl.created_at,
        b.title as blog_title
      FROM blog_likes bl
      JOIN blogs b ON bl.blog_id = b.id
      ORDER BY bl.blog_id, bl.created_at;
    `;
    
    const likesResult = await pool.query(likesQuery);
    
    for (const like of likesResult.rows) {
      console.log(`Like ID: ${like.id}`);
      console.log(`Blog: ${like.blog_title} (ID: ${like.blog_id})`);
      console.log(`User: ${like.user_display_name || like.user_name || 'Unknown'} (UID: ${like.user_firebase_uid})`);
      console.log(`Created: ${like.created_at}`);
      console.log('---');
    }
    
    // Test what the API would return for a specific user
    console.log('\n🔍 SIMULATING API RESPONSE:');
    console.log('============================');
    
    // Simulate the query that the API uses (from blog.controller.ts)
    const apiQuery = `
      SELECT 
        b.*,
        COUNT(DISTINCT bl.id) as like_count,
        COUNT(DISTINCT bc.id) as comment_count,
        EXISTS(
          SELECT 1 FROM blog_likes bl2 
          WHERE bl2.blog_id = b.id 
          AND bl2.user_firebase_uid = $1
        ) as user_liked
      FROM blogs b
      LEFT JOIN blog_likes bl ON b.id = bl.blog_id
      LEFT JOIN blog_comments bc ON b.id = bc.blog_id
      GROUP BY b.id, b.title, b.content, b.author_id, b.status, b.view_count, 
               b.like_count, b.comment_count, b.tags, b.created_at, b.updated_at,
               b.featured_image, b.author_name, b.author_display_name, b.author_email
      ORDER BY b.created_at DESC;
    `;
    
    // Test with a sample Firebase UID - you should replace this with actual UID from your app
    const testFirebaseUID = 'test-user-uid'; // Replace with actual Firebase UID if available
    
    const apiResult = await pool.query(apiQuery, [testFirebaseUID]);
    
    console.log(`Testing with Firebase UID: ${testFirebaseUID}`);
    console.log('\nAPI Response Format:');
    for (const blog of apiResult.rows) {
      console.log(`Blog ID: ${blog.id}`);
      console.log(`Title: ${blog.title}`);
      console.log(`Like Count: ${blog.like_count}`);
      console.log(`User Liked: ${blog.user_liked}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error debugging like status:', error);
  } finally {
    await pool.end();
  }
}

debugLikeStatus();
