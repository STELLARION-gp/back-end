const db = require('./db.js').default;

async function checkTriggers() {
  try {
    console.log('Checking for triggers...');
    const result = await db.query(`
      SELECT trigger_name, event_object_table as table_name, action_timing, event_manipulation 
      FROM information_schema.triggers 
      WHERE event_object_table IN ('blog_likes', 'blog_views', 'blog_comments', 'blogs')
    `);
    console.log('Triggers found:', result.rows);
    
    console.log('\nChecking blog counts in a sample blog...');
    const blogCheck = await db.query('SELECT id, views_count, likes_count, comments_count FROM blogs LIMIT 1');
    console.log('Sample blog counts:', blogCheck.rows[0]);
    
    // Check if there are any blogs
    const blogsCount = await db.query('SELECT COUNT(*) as count FROM blogs');
    console.log('Total blogs:', blogsCount.rows[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTriggers();
