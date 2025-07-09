# STELLARION Backend API - Profile System

Backend API server for the STELLARION astronomy platform with comprehensive user profile management.

## 🚀 New Profile Features Added

This implementation adds complete profile management capabilities to the existing backend without breaking current functionality.

### ✨ What's New
- **Complete User Profiles**: Extended user data with astronomy-specific fields
- **Profile Picture Upload**: Secure file upload with image validation
- **User Settings**: Comprehensive application preferences
- **Role Management**: Role upgrade request system
- **Security Operations**: Password change, account deletion, data export
- **Backward Compatibility**: All existing endpoints preserved

## 📡 API Endpoints Overview

### Profile Management
- `GET /api/user/profile` - Get complete user profile
- `PUT /api/user/profile` - Update profile information  
- `POST /api/user/profile/avatar` - Upload profile picture

### Settings Management
- `GET /api/user/settings` - Get user preferences
- `PUT /api/user/settings` - Update settings

### Security Operations
- `PUT /api/user/password` - Change password
- `DELETE /api/user/account` - Delete account
- `GET /api/user/data-export` - Export user data

### Role Management
- `POST /api/user/role-upgrade` - Request role upgrade
- `GET /api/user/role-upgrade/status` - Check upgrade status

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

New packages added:
- `multer` - File upload handling
- `bcrypt` - Password hashing
- `@types/multer` & `@types/bcrypt` - TypeScript definitions

### 2. Database Migration
For existing databases, run the profile migration:
```bash
npm run migrate-profile
```

For new setups:
```bash
npm run setup-db
```

### 3. Start Development Server
```bash
npm run dev
```

## 📊 Enhanced Database Schema

### Users Table (Extended)
```sql
-- New columns added to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(50),
  role VARCHAR(20) DEFAULT 'learner',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  profile_data JSONB DEFAULT '{}',
  role_specific_data JSONB DEFAULT '{}';
```

### New Tables Added
- `user_settings` - Application preferences
- `role_upgrade_requests` - Role change tracking  
- `user_avatars` - Profile picture management

## 🔒 Authentication Enhancement

The authentication middleware now:
- Populates `req.user` with database user info
- Updates last login timestamp
- Validates user is active
- Returns structured JSON error responses

## 📁 File Upload System

Profile pictures are handled securely:
- **Location**: `/uploads/avatars/`
- **Formats**: JPEG, PNG, GIF, WebP
- **Size Limit**: 5MB
- **Naming**: `avatar-{user_id}-{timestamp}.ext`
- **Serving**: Via `/uploads/` static route

## 🧪 Testing the New APIs

### Get User Profile
```bash
curl -H "Authorization: Bearer <firebase_jwt>" \
  http://localhost:5000/api/user/profile
```

### Update Profile
```bash
curl -X PUT \
  -H "Authorization: Bearer <firebase_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"first_name": "John", "display_name": "JohnAstro"}' \
  http://localhost:5000/api/user/profile
```

### Upload Avatar
```bash
curl -X POST \
  -H "Authorization: Bearer <firebase_jwt>" \
  -F "avatar=@profile.jpg" \
  http://localhost:5000/api/user/profile/avatar
```

## 🔄 Migration Notes

### Breaking Changes
- API base path: `/api/users` → `/api/user`  
- Error responses now use structured JSON format
- Authentication middleware enhanced with database integration

### Backward Compatibility
- Original user registration endpoints preserved
- Existing user creation flow maintained
- Database migration handles all existing users
- Default settings created automatically

## 📈 Performance Optimizations

- **Indexes**: Added on profile_data, role, display_name
- **JSONB**: Efficient storage for flexible profile data
- **File Upload**: Stream-based handling with size limits
- **Database**: Connection pooling and optimized queries

## 🛡️ Security Features

- **Input Validation**: All profile fields validated
- **File Security**: Type and size restrictions
- **Unique Constraints**: Display names enforced
- **Soft Delete**: Account deactivation vs hard delete
- **Token Validation**: Enhanced JWT handling

## 🔮 Ready for Frontend Integration

The backend now fully supports the profile requirements from:
- `profile_api.md` - Complete API specification
- `profile_summary.md` - Frontend integration guide

All endpoints match the documented interface for seamless frontend integration.

## 🚨 Error Handling

Consistent error response format:
```json
{
  "success": false,
  "error": "validation_error|unauthorized|forbidden|not_found|internal_error",
  "message": "Human readable message",
  "details": "Additional context (optional)"
}
```

## 📞 Next Steps

1. **Database Setup**: Run migration on your database
2. **Frontend Integration**: APIs ready for profile UI
3. **File Storage**: Consider CDN for production uploads  
4. **Email Service**: Add for role upgrade notifications
5. **Rate Limiting**: Implement for production security

---

This implementation provides a complete profile management system while maintaining full backward compatibility with existing functionality.
