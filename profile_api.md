# Profile API Documentation

This document outlines the required APIs for the Profile page functionality in the STELLARION platform.

## Overview

The profile system requires APIs to handle user profile data, settings, and role management. All APIs should be secured with authentication middleware.

## User Profile APIs

### 1. Get User Profile
**Endpoint:** `GET /api/user/profile`
**Description:** Retrieve the complete user profile including basic info and extended data
**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "firebase_uid": "abc123xyz",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "display_name": "JohnDoe",
    "role": "learner",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-07-09T12:00:00Z",
    "profile_data": {
      "profile_picture": "https://example.com/avatar.jpg",
      "bio": "Passionate astronomy enthusiast...",
      "location": "San Francisco, CA",
      "website": "https://johndoe.com",
      "github": "johndoe",
      "linkedin": "john-doe",
      "astronomy_experience": "intermediate",
      "favorite_astronomy_fields": ["Astrophysics", "Planetary Science"],
      "telescope_owned": true,
      "telescope_type": "Celestron NexStar 8SE",
      "observation_experience": 3,
      "certifications": ["Amateur Radio License"],
      "achievements": ["First astrophoto", "100 nights of observation"],
      "contributions": ["Wrote beginner's guide", "Mentored 5 new members"],
      "joined_communities": ["Local Astronomy Club", "Online Forums"]
    },
    "role_specific_data": {
      // For mentors/guides
      "mentoring_areas": ["Astrophotography", "Telescope setup"],
      "years_of_experience": 5,
      
      // For influencers
      "social_media_followers": 10000,
      "content_platforms": ["YouTube", "Instagram"],
      
      // For learners/enthusiasts
      "learning_goals": ["Master astrophotography", "Build own telescope"],
      "current_projects": ["M31 imaging series", "Solar observation log"]
    }
  }
}
```

### 2. Update User Profile
**Endpoint:** `PUT /api/user/profile`
**Description:** Update user profile information
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "display_name": "JohnDoe",
  "profile_data": {
    "bio": "Updated bio...",
    "location": "Updated location",
    "website": "https://newwebsite.com",
    "github": "newusername",
    "linkedin": "new-linkedin",
    "astronomy_experience": "advanced",
    "favorite_astronomy_fields": ["Cosmology", "Exoplanets"],
    "telescope_owned": true,
    "telescope_type": "New telescope model",
    "observation_experience": 4,
    "certifications": ["New certification"],
    "achievements": ["New achievement"],
    "contributions": ["New contribution"],
    "joined_communities": ["New community"]
  },
  "role_specific_data": {
    // Role-specific fields based on user's role
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    // Updated profile object
  }
}
```

### 3. Upload Profile Picture
**Endpoint:** `POST /api/user/profile/avatar`
**Description:** Upload and update user profile picture
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
FormData with 'avatar' file field
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture updated successfully",
  "data": {
    "profile_picture_url": "https://cdn.example.com/avatars/user123.jpg"
  }
}
```

## User Settings APIs

### 4. Get User Settings
**Endpoint:** `GET /api/user/settings`
**Description:** Retrieve user application settings
**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "language": "en",
    "email_notifications": true,
    "push_notifications": true,
    "profile_visibility": "public",
    "allow_direct_messages": true,
    "show_online_status": true,
    "theme": "dark",
    "timezone": "America/New_York"
  }
}
```

### 5. Update User Settings
**Endpoint:** `PUT /api/user/settings`
**Description:** Update user application settings
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "language": "es",
  "email_notifications": false,
  "push_notifications": true,
  "profile_visibility": "community-only",
  "allow_direct_messages": false,
  "show_online_status": true,
  "theme": "light",
  "timezone": "Europe/London"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    // Updated settings object
  }
}
```

## Authentication & Security APIs

### 6. Change Password
**Endpoint:** `PUT /api/user/password`
**Description:** Change user password
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "current_password": "currentPassword123",
  "new_password": "newPassword456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 7. Delete Account
**Endpoint:** `DELETE /api/user/account`
**Description:** Permanently delete user account
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "confirmation": "DELETE",
  "password": "userPassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### 8. Download User Data
**Endpoint:** `GET /api/user/data-export`
**Description:** Export all user data for download
**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "download_url": "https://api.example.com/exports/user123_data.zip",
    "expires_at": "2024-07-10T12:00:00Z"
  }
}
```

## Role Management APIs

### 9. Request Role Upgrade
**Endpoint:** `POST /api/user/role-upgrade`
**Description:** Request upgrade to next role level
**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "requested_role": "mentor",
  "reason": "I have 5+ years of experience and want to help others",
  "supporting_evidence": [
    "Link to portfolio",
    "Certifications",
    "Community contributions"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role upgrade request submitted successfully",
  "data": {
    "request_id": 456,
    "status": "pending",
    "submitted_at": "2024-07-09T12:00:00Z"
  }
}
```

### 10. Get Role Upgrade Status
**Endpoint:** `GET /api/user/role-upgrade/status`
**Description:** Check status of role upgrade requests
**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "current_requests": [
      {
        "request_id": 456,
        "requested_role": "mentor",
        "status": "pending",
        "submitted_at": "2024-07-09T12:00:00Z",
        "reviewed_at": null,
        "reviewer_notes": null
      }
    ],
    "request_history": [
      {
        "request_id": 123,
        "requested_role": "guide",
        "status": "approved",
        "submitted_at": "2024-06-01T12:00:00Z",
        "reviewed_at": "2024-06-05T12:00:00Z",
        "reviewer_notes": "Approved based on community contributions"
      }
    ]
  }
}
```

## Database Schema Requirements

### User Profiles Table Enhancement
```sql
ALTER TABLE users ADD COLUMN profile_data JSONB;
ALTER TABLE users ADD COLUMN role_specific_data JSONB;

-- Index for better performance
CREATE INDEX idx_users_profile_data ON users USING GIN (profile_data);
CREATE INDEX idx_users_role_specific_data ON users USING GIN (role_specific_data);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    profile_visibility VARCHAR(20) DEFAULT 'public',
    allow_direct_messages BOOLEAN DEFAULT true,
    show_online_status BOOLEAN DEFAULT true,
    theme VARCHAR(10) DEFAULT 'dark',
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

### Role Upgrade Requests Table
```sql
CREATE TABLE role_upgrade_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    current_role VARCHAR(20) NOT NULL,
    requested_role VARCHAR(20) NOT NULL,
    reason TEXT,
    supporting_evidence JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reviewer_id INTEGER REFERENCES users(id),
    reviewer_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    
    INDEX idx_role_requests_user_id (user_id),
    INDEX idx_role_requests_status (status)
);
```

### Profile Pictures Storage
```sql
CREATE TABLE user_avatars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, is_active) WHERE is_active = true
);
```

## Error Handling

All APIs should return consistent error responses:

### Validation Errors (400)
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Invalid input data",
  "details": {
    "field": "email",
    "error": "Invalid email format"
  }
}
```

### Authentication Errors (401)
```json
{
  "success": false,
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

### Permission Errors (403)
```json
{
  "success": false,
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

### Not Found Errors (404)
```json
{
  "success": false,
  "error": "not_found",
  "message": "Resource not found"
}
```

### Server Errors (500)
```json
{
  "success": false,
  "error": "internal_error",
  "message": "An unexpected error occurred"
}
```

## Security Considerations

1. **Input Validation**: Validate all input data, especially file uploads
2. **Rate Limiting**: Implement rate limiting for sensitive operations
3. **File Upload Security**: 
   - Validate file types and sizes
   - Scan for malware
   - Use secure storage with CDN
4. **Data Privacy**: Ensure GDPR compliance for data exports and deletion
5. **Role Permissions**: Verify user permissions for role-based features
6. **Password Security**: Use bcrypt for password hashing
7. **Audit Logging**: Log important profile changes and role upgrades

## Implementation Notes

1. **Caching**: Implement caching for frequently accessed profile data
2. **Image Processing**: Resize and optimize uploaded profile pictures
3. **Background Jobs**: Use queues for data exports and heavy operations
4. **Notifications**: Send email/push notifications for important changes
5. **Backup**: Regular backups of user data
6. **Migration**: Plan for smooth migration of existing user data
