// migrate-blog-schema.js - Migrate existing blog tables to new schema
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

async function migrateBlogSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Connecting to database...');
    
    // Start transaction
    await client.query('BEGIN');
    
    console.log('🔄 Starting blog schema migration...');
    
    // 1. Create blog_status enum if it doesn't exist
    console.log('📝 Creating blog_status enum...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // 2. Add missing columns to blogs table
    console.log('🔧 Adding missing columns to blogs table...');
    
    const alterQueries = [
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';`,
      `ALTER TABLE blogs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';`,
      
      // Update existing columns to match new schema
      `UPDATE blogs SET view_count = COALESCE(views_count, 0) WHERE view_count IS NULL;`,
      `UPDATE blogs SET like_count = COALESCE(likes_count, 0) WHERE like_count IS NULL;`,
      `UPDATE blogs SET comment_count = COALESCE(comments_count, 0) WHERE comment_count IS NULL;`,
    ];
    
    for (const query of alterQueries) {
      try {
        await client.query(query);
      } catch (error) {
        console.log(`   ⚠️  Column might already exist: ${error.message.split('\\n')[0]}`);
      }
    }
    
    // 3. Create blog_comments table
    console.log('📝 Creating blog_comments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_comments (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        parent_comment_id INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 4. Create blog_views table
    console.log('📝 Creating blog_views table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_views (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER REFERENCES blogs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ip_address INET,
        user_agent TEXT,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 5. Add missing indexes
    console.log('📇 Creating missing indexes...');
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_blogs_published_at ON blogs(published_at);`,
      `CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON blog_comments(blog_id);`,
      `CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON blog_comments(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON blog_likes(blog_id);`,
      `CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON blog_likes(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_blog_views_blog_id ON blog_views(blog_id);`,
    ];
    
    for (const indexQuery of indexes) {
      try {
        await client.query(indexQuery);
      } catch (error) {
        console.log(`   ⚠️  Index might already exist: ${error.message.split('\\n')[0]}`);
      }
    }
    
    // 6. Create the update_blog_stats function
    console.log('⚡ Creating blog stats function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_blog_stats() RETURNS TRIGGER AS $$
      BEGIN
        IF TG_TABLE_NAME = 'blog_comments' THEN
          IF TG_OP = 'INSERT' THEN
            UPDATE blogs SET comment_count = comment_count + 1 WHERE id = NEW.blog_id;
          ELSIF TG_OP = 'DELETE' THEN
            UPDATE blogs SET comment_count = comment_count - 1 WHERE id = OLD.blog_id;
          END IF;
        ELSIF TG_TABLE_NAME = 'blog_likes' THEN
          IF TG_OP = 'INSERT' THEN
            UPDATE blogs SET like_count = like_count + 1 WHERE id = NEW.blog_id;
          ELSIF TG_OP = 'DELETE' THEN
            UPDATE blogs SET like_count = like_count - 1 WHERE id = OLD.blog_id;
          END IF;
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 7. Create triggers
    console.log('⚡ Creating triggers...');
    const triggers = [
      `DROP TRIGGER IF EXISTS update_blogs_updated_at ON blogs;`,
      `CREATE TRIGGER update_blogs_updated_at 
        BEFORE UPDATE ON blogs 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();`,
      
      `DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;`,
      `CREATE TRIGGER update_blog_comments_updated_at 
        BEFORE UPDATE ON blog_comments 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();`,
      
      `DROP TRIGGER IF EXISTS update_blog_comment_count ON blog_comments;`,
      `CREATE TRIGGER update_blog_comment_count
        AFTER INSERT OR DELETE ON blog_comments
        FOR EACH ROW EXECUTE FUNCTION update_blog_stats();`,
      
      `DROP TRIGGER IF EXISTS update_blog_like_count ON blog_likes;`,
      `CREATE TRIGGER update_blog_like_count
        AFTER INSERT OR DELETE ON blog_likes
        FOR EACH ROW EXECUTE FUNCTION update_blog_stats();`,
    ];
    
    for (const triggerQuery of triggers) {
      try {
        await client.query(triggerQuery);
      } catch (error) {
        console.log(`   ⚠️  Trigger issue: ${error.message.split('\\n')[0]}`);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Blog schema migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'blog%'
      ORDER BY table_name;
    `;
    
    const result = await client.query(tablesQuery);
    console.log('📋 Blog tables:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    
    // Check new columns in blogs table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blogs' 
      AND table_schema = 'public'
      AND column_name IN ('published_at', 'view_count', 'like_count', 'comment_count', 'tags', 'metadata', 'image_url')
      ORDER BY column_name;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('📝 New columns in blogs table:');
    columnsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.column_name}`);
    });
    
    console.log('\\n🎉 Blog schema is now ready for use!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  migrateBlogSchema()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateBlogSchema };
