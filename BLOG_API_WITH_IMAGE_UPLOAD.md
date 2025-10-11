# Blog API with Cloudinary Image Upload

## Overview

The blog system now supports **direct image upload** to Cloudinary during blog creation and updates. Images are automatically uploaded to Cloudinary and URLs are saved in the `image_url` and `featured_image` columns.

## API Endpoints

### Create Blog with Image

**POST** `/api/blogs`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✓ | Blog title (max 255 chars) |
| `content` | string | ✓ | Blog content (full text) |
| `excerpt` | string | ✗ | Short excerpt/summary |
| `status` | string | ✗ | 'draft' or 'published' (default: 'draft') |
| `image` | file | ✗ | Image file (JPEG, PNG, GIF, etc.) |
| `tags` | JSON string | ✗ | Array of tags as JSON string: `'["astronomy","stars"]'` |
| `metadata` | JSON string | ✗ | Additional metadata as JSON string |

**Response:**
```json
{
  "success": true,
  "message": "Blog created successfully",
  "data": {
    "id": 123,
    "title": "My First Blog",
    "content": "Content here...",
    "excerpt": "Short summary",
    "image_url": "https://res.cloudinary.com/.../blog_123_1234567890.jpg",
    "featured_image": "https://res.cloudinary.com/.../blog_123_1234567890.jpg",
    "author_id": 3,
    "status": "draft",
    "published_at": null,
    "view_count": 0,
    "like_count": 0,
    "comment_count": 0,
    "tags": ["astronomy", "stars"],
    "metadata": {},
    "created_at": "2025-10-11T20:00:00.000Z",
    "updated_at": "2025-10-11T20:00:00.000Z",
    "author_name": "John Doe",
    "author_email": "john@example.com",
    "author_display_name": "JohnD"
  }
}
```

### Update Blog with Image

**PUT** `/api/blogs/:id`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data` or `application/json`

**Form Fields:** (same as create, all optional except at least one field must be provided)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✗ | New blog title |
| `content` | string | ✗ | New blog content |
| `excerpt` | string | ✗ | New excerpt |
| `status` | string | ✗ | 'draft', 'published', or 'archived' |
| `image` | file | ✗ | New image file (replaces existing) |
| `tags` | JSON string | ✗ | New tags array |
| `metadata` | JSON string | ✗ | New metadata |

**Response:** Same format as create

## Frontend Integration Guide

### Option 1: Using FormData (Recommended for Direct Upload)

```typescript
// Frontend: Create blog with backend Cloudinary upload
async function createBlogWithBackendUpload(
  title: string,
  content: string,
  imageFile: File | null,
  status: 'draft' | 'published' = 'draft'
) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('status', status);
  
  if (imageFile) {
    formData.append('image', imageFile); // Backend handles Cloudinary upload
  }
  
  // Optional fields
  formData.append('excerpt', content.substring(0, 150) + '...');
  formData.append('tags', JSON.stringify(['astronomy', 'space']));

  const token = await getAuthToken(); // Your auth token retrieval

  const response = await fetch('http://localhost:5000/api/blogs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // DON'T set Content-Type - browser sets it with boundary for multipart
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create blog');
  }

  return await response.json();
}
```

### Option 2: Using Firebase Upload (Existing Frontend Code)

If you prefer to upload to Firebase first (as your current code does):

```typescript
// Frontend: Upload to Firebase first, then create blog with URL
async function createBlogWithFirebaseUpload(
  title: string,
  content: string,
  imageFile: File | null,
  status: 'draft' | 'published' = 'draft'
) {
  let imageUrl = 'https://default-image-url.com/default.jpg';
  
  // Upload to Firebase (your existing FirebaseStorageService)
  if (imageFile) {
    imageUrl = await FirebaseStorageService.uploadBlogImage(imageFile);
  }

  const token = await getAuthToken();

  const response = await fetch('http://localhost:5000/api/blogs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title,
      content,
      excerpt: content.substring(0, 150) + '...',
      featured_image: imageUrl, // Pre-uploaded URL
      status,
      tags: ['astronomy', 'space'],
      metadata: {}
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create blog');
  }

  return await response.json();
}
```

### Recommended: Hybrid Approach

Use backend upload for new blogs (simpler), but keep Firebase for updates if image already exists:

```typescript
// services/blogService.ts
export const blogService = {
  // Create with backend upload
  async createBlog(data: {
    title: string;
    content: string;
    status: 'draft' | 'published';
    imageFile?: File;
  }) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content);
    formData.append('status', data.status);
    
    if (data.imageFile) {
      formData.append('image', data.imageFile);
    }

    const token = await getAuthToken();

    const response = await fetch(`${API_BASE}/blogs`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to create blog');
    return response.json();
  },

  // Update with backend upload
  async updateBlog(
    blogId: number,
    data: {
      title?: string;
      content?: string;
      status?: 'draft' | 'published';
      imageFile?: File;
    }
  ) {
    const formData = new FormData();
    
    if (data.title) formData.append('title', data.title);
    if (data.content) formData.append('content', data.content);
    if (data.status) formData.append('status', data.status);
    if (data.imageFile) formData.append('image', data.imageFile);

    const token = await getAuthToken();

    const response = await fetch(`${API_BASE}/blogs/${blogId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!response.ok) throw new Error('Failed to update blog');
    return response.json();
  }
};
```

## Key Features

### ✅ Automatic Cloudinary Upload
- Images uploaded directly to Cloudinary during create/update
- Optimized with transformations (max 1200x630, auto quality, auto format)
- Stored in `/blogs` folder in Cloudinary

### ✅ Dual Column Support
- `image_url` - Backward compatibility
- `featured_image` - Primary field
- Both populated with same Cloudinary URL

### ✅ Comprehensive Logging
- All operations logged with `[blog][create]` and `[blog][update]` prefixes
- Detailed error messages for debugging
- Image upload success/failure tracked

### ✅ Flexible Input
- Accepts both `multipart/form-data` (with file) and JSON (with URL)
- Tags and metadata can be JSON strings or objects
- Works with existing Firebase upload flow

### ✅ Data Validation
- Title and content required for creation
- Image upload optional
- File type validation (images only)
- 10MB file size limit

## Database Schema

```sql
-- Key columns in blogs table
image_url VARCHAR(500)      -- Cloudinary URL
featured_image VARCHAR(500) -- Cloudinary URL (same as image_url)
title VARCHAR(255) NOT NULL
content TEXT NOT NULL
excerpt TEXT
author_id INT REFERENCES users(id)
status VARCHAR(20) DEFAULT 'draft'
published_at TIMESTAMP
view_count INT DEFAULT 0
like_count INT DEFAULT 0
comment_count INT DEFAULT 0
tags JSON DEFAULT '[]'
metadata JSON DEFAULT '{}'
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

## Testing

### Test Create with cURL

```bash
curl -X POST http://localhost:5000/api/blogs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Blog with Image" \
  -F "content=This is the blog content with an uploaded image." \
  -F "status=published" \
  -F "image=@/path/to/image.jpg" \
  -F 'tags=["test","cloudinary"]'
```

### Test Update with cURL

```bash
curl -X PUT http://localhost:5000/api/blogs/123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Updated Title" \
  -F "image=@/path/to/new-image.jpg"
```

## Migration Notes

### For Existing Frontend Code

Your current `myblogs.tsx` already has most of the structure. Key changes needed:

1. **Update `handleCreateBlog` and `handlePublishBlog`:**
   - Change to use `FormData` instead of JSON
   - Pass `newBlog.image` file directly (don't upload to Firebase first)
   - Let backend handle Cloudinary upload

2. **Update `handleUpdateBlog`:**
   - Use `FormData` if `newBlog.image` exists
   - Otherwise use JSON for text-only updates

3. **Remove Firebase upload calls** (optional):
   - Keep `FirebaseStorageService` for fallback
   - Use backend upload as primary method

### Example Migration

```typescript
// OLD (Firebase upload first)
if (newBlog.image) {
  imageUrl = await FirebaseStorageService.uploadBlogImage(newBlog.image);
}
const response = await blogService.createBlog({
  title: newBlog.title,
  content: newBlog.content,
  featured_image: imageUrl,
  status: 'published'
});

// NEW (Backend handles upload)
const formData = new FormData();
formData.append('title', newBlog.title);
formData.append('content', newBlog.content);
formData.append('status', 'published');
if (newBlog.image) {
  formData.append('image', newBlog.image);
}
const response = await fetch(`${API_BASE}/blogs`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Title and content are required" | Missing fields | Provide both title and content |
| "Authentication required" | No/invalid token | Check auth token |
| "Failed to upload image" | Cloudinary error | Check Cloudinary credentials, file size |
| "Only image files are allowed" | Wrong file type | Use JPEG, PNG, GIF, etc. |
| "User not found in database" | Firebase UID not in users table | Ensure user registered properly |

## Next Steps

1. ✅ Backend ready for image uploads
2. Update frontend to use FormData
3. Test create/update with images
4. Monitor Cloudinary dashboard for uploads
5. Consider adding image deletion when blog deleted (optional)
