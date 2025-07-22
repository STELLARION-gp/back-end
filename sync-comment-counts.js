// Script to sync comment counts in the blogs table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'stellarion_db',
    password: process.env.DB_PASS || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function syncCommentCounts() {
    try {
        console.log('🔄 Syncing comment counts...');
        
        // Update comment_count field for all blogs
        const result = await pool.query(`
            UPDATE blogs 
            SET comment_count = (
                SELECT COUNT(*) 
                FROM blog_comments 
                WHERE blog_comments.blog_id = blogs.id
            )
        `);
        
        console.log(`✅ Updated comment counts for ${result.rowCount} blogs`);
        
        // Show current comment counts
        const counts = await pool.query(`
            SELECT 
                b.id,
                b.title,
                b.comment_count,
                COUNT(c.id) as actual_comments
            FROM blogs b
            LEFT JOIN blog_comments c ON b.id = c.blog_id
            GROUP BY b.id, b.title, b.comment_count
            ORDER BY b.id
        `);
        
        console.log('\n📊 Current comment counts:');
        counts.rows.forEach(row => {
            console.log(`Blog ${row.id}: "${row.title}" - DB count: ${row.comment_count}, Actual: ${row.actual_comments}`);
        });
        
    } catch (error) {
        console.error('❌ Error syncing comment counts:', error);
    } finally {
        await pool.end();
    }
}

syncCommentCounts();
