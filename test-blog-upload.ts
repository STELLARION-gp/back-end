// Test blog creation with image upload
// Usage: npx ts-node test-blog-upload.ts

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE = 'http://localhost:5000/api';

// You need to replace this with a valid auth token
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE';

async function testBlogCreation() {
  console.log('=== Testing Blog Creation with Image Upload ===\n');

  // Create a test image buffer (1x1 PNG)
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  // Test 1: Create blog with image
  console.log('Test 1: Creating blog with image upload...');
  const formData = new FormData();
  formData.append('title', 'Test Blog from Diagnostic Script');
  formData.append('content', 'This is a test blog post created via the API with an uploaded image. The image should be uploaded to Cloudinary and the URL saved in the database.');
  formData.append('status', 'draft');
  formData.append('excerpt', 'Test blog with Cloudinary upload');
  formData.append('tags', JSON.stringify(['test', 'cloudinary', 'upload']));
  formData.append('image', testImageBuffer, {
    filename: 'test-image.png',
    contentType: 'image/png'
  });

  try {
    const response = await fetch(`${API_BASE}/blogs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ Blog created successfully!');
      console.log('Blog ID:', result.data.id);
      console.log('Image URL:', result.data.image_url);
      console.log('Featured Image:', result.data.featured_image);
      
      // Test 2: Update the blog
      const blogId = result.data.id;
      console.log(`\nTest 2: Updating blog ${blogId}...`);
      
      const updateData = new FormData();
      updateData.append('title', 'Updated Test Blog Title');
      updateData.append('status', 'published');
      
      const updateResponse = await fetch(`${API_BASE}/blogs/${blogId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          ...updateData.getHeaders()
        },
        body: updateData
      });
      
      const updateResult = await updateResponse.json();
      console.log('Update response:', JSON.stringify(updateResult, null, 2));
      
      if (updateResult.success) {
        console.log('\n✅ Blog updated successfully!');
        console.log('New status:', updateResult.data.status);
        console.log('Published at:', updateResult.data.published_at);
      }
      
      // Test 3: Get the blog
      console.log(`\nTest 3: Retrieving blog ${blogId}...`);
      const getResponse = await fetch(`${API_BASE}/blogs/${blogId}`, {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });
      
      const getResult = await getResponse.json();
      console.log('Retrieved blog:', JSON.stringify(getResult, null, 2));
      
      // Cleanup
      console.log(`\nCleaning up: Deleting blog ${blogId}...`);
      const deleteResponse = await fetch(`${API_BASE}/blogs/${blogId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      });
      
      const deleteResult = await deleteResponse.json();
      console.log('Delete response:', JSON.stringify(deleteResult, null, 2));
      
    } else {
      console.log('\n❌ Failed to create blog');
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n=== Tests Complete ===');
}

console.log('\n⚠️  IMPORTANT: Update AUTH_TOKEN in this script first!\n');
console.log('To get a token:');
console.log('1. Log in to your app');
console.log('2. Open browser DevTools > Application > Local Storage');
console.log('3. Copy the auth token');
console.log('4. Replace YOUR_AUTH_TOKEN_HERE in this script\n');

// Uncomment to run
// testBlogCreation();
