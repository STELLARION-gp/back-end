# 🚀 STELLARION Backend API - Complete Implementation

## Overview
This is the complete backend implementation for the STELLARION space exploration application. It provides all the APIs required by the frontend, including user management, authentication, profile management, settings, role upgrades, and chatbot functionality.

## ✅ Implemented Features

### 🔐 Authentication & Security
- Firebase JWT authentication
- Role-based access control (7 user roles)
- Password management
- Account deletion
- Data export (GDPR compliance)

### 👥 User Management
- User registration and profile management
- Role-based permissions
- User activation/deactivation
- Comprehensive user listing with pagination

### 📋 Profile Management
- Detailed user profiles with extended data
- Profile picture upload support
- Custom profile fields for astronomy enthusiasts
- Role-specific data storage

### ⚙️ Settings Management
- User preferences (theme, language, notifications)
- Privacy settings
- Timezone and localization support

### 🎯 Role Upgrade System
- Request role upgrades with supporting evidence
- Admin approval/rejection workflow
- Status tracking and history

### 🤖 Chatbot Integration
- Space exploration AI assistant
- Health monitoring
- Rate limiting and error handling

## 🗂️ API Endpoints

### Health Check
- `GET /health` - Server health check

### User Management
- `POST /api/users/register` - Register/login user
- `GET /api/users/profile` - Get current user profile
- `GET /api/users` - Get all users (Manager/Admin only)
- `PUT /api/users/:userId/role` - Update user role (Admin only)
- `PUT /api/users/:userId/deactivate` - Deactivate user (Admin only)
- `PUT /api/users/:userId/activate` - Activate user (Admin only)

### Authentication
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in user
- `POST /api/auth/signout` - Sign out user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `DELETE /api/auth/account` - Delete account
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email

### Profile Management
- `GET /api/user/profile` - Get detailed user profile
- `PUT /api/user/profile` - Update detailed profile
- `POST /api/user/profile/avatar` - Upload profile picture
- `GET /api/user/data-export` - Export user data

### Settings Management
- `GET /api/user/settings` - Get user settings
- `PUT /api/user/settings` - Update user settings

### Role Upgrade System
- `POST /api/user/role-upgrade` - Request role upgrade
- `GET /api/user/role-upgrade/status` - Get upgrade status
- `GET /api/user/admin/role-upgrade-requests` - Get all requests (Admin)
- `PUT /api/user/admin/role-upgrade-requests/:requestId` - Process request (Admin)

### Chatbot
- `POST /api/chatbot` - Chat with AI assistant
- `GET /api/chatbot/health` - Chatbot health check

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'learner',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    profile_data JSONB DEFAULT '{}',
    role_specific_data JSONB DEFAULT '{}'
);
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
    current_role user_role NOT NULL,
    requested_role user_role NOT NULL,
    reason TEXT,
    supporting_evidence JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    reviewer_id INTEGER REFERENCES users(id),
    reviewer_notes TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Firebase project with Admin SDK

### Installation

1. **Clone and install dependencies**
```bash
cd back-end
npm install
```

2. **Set up environment variables**
```bash
# Create .env file
cp .env.example .env

# Edit with your values:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stellarion
DB_USER=your_db_user
DB_PASSWORD=your_db_password
FIREBASE_PROJECT_ID=your_firebase_project_id
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

3. **Set up Firebase**
- Place your `serviceAccountKey.json` in the root directory
- Configure Firebase Authentication in your project

4. **Set up database**
```bash
# Create database and basic schema
npm run setup-db

# Update to latest schema with new features
npm run update-schema

# Insert sample users
npm run insert-sample-users

# Create Firebase test users
npm run create-firebase-users
```

5. **Start the server**
```bash
npm run dev
```

## 🧪 Testing

### Run comprehensive API tests
```bash
npm run test-all
```

### Test specific features
```bash
npm run test-api      # Basic API tests
npm run test-chatbot  # Chatbot functionality
```

### Manual testing
Use the provided example files in `frontend-examples/` for testing with React.

## 📁 Project Structure

```
├── controllers/
│   ├── auth.controller.ts         # Authentication logic
│   ├── user.controller.ts         # User management
│   ├── profile.controller.ts      # Profile management
│   ├── roleUpgrade.controller.ts  # Role upgrade system
│   └── chatbot.controller.ts      # AI chatbot
├── middleware/
│   ├── verifyToken.ts            # Firebase JWT verification
│   ├── roleAuth.ts               # Role-based access control
│   └── errorHandler.ts           # Error handling
├── routes/
│   ├── auth.routes.ts            # Authentication routes
│   ├── user.routes.ts            # User management routes
│   ├── profile.routes.ts         # Profile & settings routes
│   └── chatbot.routes.ts         # Chatbot routes
├── database/
│   └── schema.sql                # Database schema
├── scripts/
│   ├── setup-database.js         # Database setup
│   ├── update-database-schema.js # Schema updates
│   ├── insert-sample-users.js    # Sample data
│   ├── create-firebase-users.js  # Firebase test users
│   └── test-all-apis.js          # Comprehensive testing
├── types/
│   └── index.ts                  # TypeScript definitions
├── db.ts                         # Database connection
├── firebaseAdmin.ts              # Firebase admin setup
└── index.ts                      # Main server file
```

## 🔧 User Roles & Permissions

### Role Hierarchy
1. **admin** - Full system access
2. **moderator** - Community management
3. **mentor** - Teaching and guidance
4. **influencer** - Content creation
5. **guide** - User assistance
6. **enthusiast** - Active participation
7. **learner** - Basic access (default)

### Permission Levels
- **Admin**: All endpoints
- **Manager**: User viewing, no modifications
- **User**: Own profile only

## 🔐 Security Features

### Authentication
- Firebase JWT token verification
- Token refresh handling
- Session management

### Authorization
- Role-based access control
- Resource-level permissions
- Admin-only endpoints

### Data Protection
- Input validation
- SQL injection prevention
- GDPR compliance (data export)

## 🚦 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "error_code",
  "details": "Additional details"
}
```

## 📊 Rate Limiting

### Chatbot Endpoints
- 50 requests per 15 minutes (general)
- 10 requests per minute (chat completion)

### General API
- Standard rate limiting applied
- Configurable per endpoint

## 🔄 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run setup-db         # Set up database
npm run update-schema    # Update database schema
npm run insert-sample-users  # Add sample users
npm run create-firebase-users  # Create Firebase test users
npm run setup-all        # Complete setup
npm run test-all         # Run all API tests
npm run test-api         # Basic API tests
npm run test-chatbot     # Chatbot tests
```

## 📝 Development Notes

### Adding New Endpoints
1. Define types in `types/index.ts`
2. Create controller functions in `controllers/`
3. Add routes in `routes/`
4. Update documentation

### Database Migrations
- Use `update-database-schema.js` for schema changes
- Always test with sample data
- Update types accordingly

### Testing
- Use `test-all-apis.js` for comprehensive testing
- Test both authenticated and unauthenticated scenarios
- Verify error handling

## 🎯 Next Steps

### Frontend Integration
1. Update frontend API calls to use new endpoints
2. Test with real Firebase authentication
3. Implement role-based UI components

### Production Deployment
1. Set up environment variables
2. Configure database connections
3. Set up monitoring and logging

### Enhanced Features
- File upload for profile pictures
- Real-time notifications
- Advanced search capabilities
- Analytics and reporting

## 📞 Support

For questions or issues:
1. Check the test scripts for usage examples
2. Review the API documentation
3. Test with provided sample data
4. Verify Firebase configuration

This backend now provides **complete API coverage** for all frontend requirements as specified in the `required_apis.md` document!
