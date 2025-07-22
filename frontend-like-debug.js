// frontend-like-debug.js - Simulate frontend like status issue
// This simulates what happens in the MyBlogs component

// Mock API response based on actual API structure
const mockApiResponse = {
  success: true,
  message: "Blogs retrieved successfully",
  data: {
    blogs: [
      {
        id: 3,
        title: "Astrophotography On A Budget",
        content: "Sample content...",
        author_name: "Irumi",
        author_display_name: "Irumi Abeywickramaya", 
        author_email: "irumi@example.com",
        like_count: 5,
        user_liked: true,  // THIS IS THE KEY FIELD - should indicate if current user liked it
        is_liked: true,    // Alternative field name
        liked: true,       // Another alternative
        view_count: 150,
        comment_count: 3,
        status: "published",
        created_at: "2023-01-15T10:30:00Z",
        featured_image: "https://example.com/image.jpg"
      },
      {
        id: 4,
        title: "Galaxy Photography Tips",
        content: "More sample content...",
        author_name: "Irumi",
        author_display_name: "Irumi Abeywickramaya",
        author_email: "irumi@example.com", 
        like_count: 0,
        user_liked: false,
        is_liked: false,
        liked: false,
        view_count: 50,
        comment_count: 1,
        status: "published",
        created_at: "2023-01-10T15:45:00Z",
        featured_image: "https://example.com/image2.jpg"
      }
    ]
  }
};

// Simulate the current user
const mockCurrentUser = {
  uid: "user123",
  email: "irumi@example.com",
  displayName: "Irumi Abeywickramaya"
};

// Simulate the frontend loadMyBlogs conversion logic
function simulateLoadMyBlogs(apiResponse, currentUser) {
  console.log('🔍 SIMULATING FRONTEND loadMyBlogs FUNCTION');
  console.log('=============================================\n');
  
  const currentUserName = currentUser.displayName || 'User';
  console.log('Current user name:', currentUserName);
  console.log('Current user email:', currentUser.email);
  
  if (apiResponse.success && apiResponse.data && apiResponse.data.blogs) {
    console.log('\n📚 Processing blogs from API...');
    
    // Filter blogs by current user (this is the logic from MyBlogs component)
    const userBlogs = apiResponse.data.blogs.filter((blog) => {
      const matchesAuthorName = blog.author_name && 
                               (blog.author_name.toLowerCase().includes(currentUserName.toLowerCase()) ||
                                currentUserName.toLowerCase().includes(blog.author_name.toLowerCase()));
      const matchesDisplayName = blog.author_display_name === currentUserName;
      const matchesEmail = blog.author_email === currentUser.email;
      
      console.log(`\nBlog filter check for "${blog.title}":`, {
        blogId: blog.id,
        blogAuthor: blog.author_name,
        blogDisplayName: blog.author_display_name,
        blogEmail: blog.author_email,
        currentUserName,
        currentUserEmail: currentUser.email,
        matchesAuthorName,
        matchesDisplayName,
        matchesEmail,
        willInclude: matchesAuthorName || matchesDisplayName || matchesEmail
      });
      
      return matchesAuthorName || matchesDisplayName || matchesEmail;
    });
    
    console.log(`\n✅ Found ${userBlogs.length} blogs for current user`);
    
    // Convert to component format (this is the critical part)
    const convertedBlogs = userBlogs.map((blog) => {
      const likedStatus = blog.user_liked || blog.is_liked || blog.liked || false;
      
      console.log(`\n🔄 Converting blog "${blog.title}":`, {
        originalLikeData: {
          like_count: blog.like_count,
          user_liked: blog.user_liked,
          is_liked: blog.is_liked,
          liked: blog.liked
        },
        convertedLikeData: {
          likes: blog.like_count || 0,
          like_count: blog.like_count || 0,
          liked: likedStatus
        }
      });
      
      return {
        id: blog.id,
        title: blog.title,
        content: blog.content,
        author: blog.author_name || blog.author_display_name || currentUserName,
        date: blog.created_at,
        reach: blog.view_count || 0,
        likes: blog.like_count || 0,
        rating: 0,
        comments: [], // Would be loaded separately
        liked: likedStatus, // This is the key field!
        published: blog.status === 'published',
        createdAt: blog.created_at,
        image: blog.featured_image || 'default-image.jpg',
        image_url: blog.featured_image || 'default-image.jpg',
        featured_image: blog.featured_image || 'default-image.jpg',
        view_count: blog.view_count || 0,
        like_count: blog.like_count || 0,
        comment_count: blog.comment_count || 0
      };
    });
    
    console.log('\n🎯 FINAL CONVERTED BLOGS:');
    console.log('=========================');
    convertedBlogs.forEach(blog => {
      console.log(`Blog "${blog.title}":`, {
        id: blog.id,
        likes: blog.likes,
        like_count: blog.like_count,
        liked: blog.liked,
        shouldShowLiked: blog.liked ? '❤️ LIKED' : '🤍 NOT LIKED'
      });
    });
    
    return convertedBlogs;
  }
  
  return [];
}

// Run the simulation
console.log('🧪 FRONTEND LIKE STATUS DEBUG SIMULATION');
console.log('=========================================\n');

const result = simulateLoadMyBlogs(mockApiResponse, mockCurrentUser);

console.log('\n📋 SUMMARY:');
console.log('===========');
console.log(`Total blogs converted: ${result.length}`);
result.forEach(blog => {
  console.log(`- "${blog.title}": ${blog.liked ? '✅ Should show as LIKED' : '❌ Should show as NOT LIKED'}`);
});

console.log('\n💡 KEY INSIGHTS:');
console.log('================');
console.log('1. The frontend conversion logic checks: blog.user_liked || blog.is_liked || blog.liked');
console.log('2. This should map the API response fields to the component state');
console.log('3. If like status persists in DB but not showing in UI, check:');
console.log('   - Is the API returning user_liked=true for authenticated user?');
console.log('   - Is the frontend mapping this field correctly?');
console.log('   - Is the like status being overwritten somewhere else?');
