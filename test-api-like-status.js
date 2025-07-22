// test-api-like-status.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testApiLikeStatus() {
  try {
    console.log('🔍 Testing API like status...');
    
    // Test the blogs API endpoint
    const response = await fetch('http://localhost:5000/api/blogs');
    const data = await response.json();
    
    console.log('\n📡 API Response:');
    console.log('Success:', data.success);
    console.log('Message:', data.message);
    
    if (data.success && data.data && data.data.blogs) {
      console.log('\n📚 Blogs with like information:');
      console.log('=================================');
      
      data.data.blogs.forEach((blog, index) => {
        console.log(`\n${index + 1}. Blog ID: ${blog.id}`);
        console.log(`   Title: ${blog.title}`);
        console.log(`   Author: ${blog.author_name || blog.author_display_name || 'Unknown'}`);
        console.log(`   Like Count: ${blog.like_count}`);
        console.log(`   User Liked: ${blog.user_liked || 'false'}`);
        console.log(`   View Count: ${blog.view_count}`);
        console.log(`   Comment Count: ${blog.comment_count}`);
        
        // Show all available fields for debugging
        console.log('   Available fields:', Object.keys(blog).join(', '));
      });
      
      // Test a specific blog like toggle (if we have blogs)
      if (data.data.blogs.length > 0) {
        const testBlogId = data.data.blogs[0].id;
        console.log(`\n🧪 Testing like toggle for blog ID: ${testBlogId}`);
        
        try {
          const likeResponse = await fetch(`http://localhost:5000/api/blogs/${testBlogId}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Note: In real app, this would include Firebase auth token
            }
          });
          
          const likeData = await likeResponse.json();
          console.log('Like toggle response:', likeData);
          
          if (likeData.success) {
            console.log('✅ Like toggle successful');
            console.log('   New like count:', likeData.data.like_count);
            console.log('   User liked:', likeData.data.liked || likeData.data.user_liked);
          } else {
            console.log('❌ Like toggle failed:', likeData.message);
          }
        } catch (likeError) {
          console.log('❌ Error testing like toggle:', likeError.message);
        }
      }
    } else {
      console.log('❌ No blogs found in API response');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testApiLikeStatus();
