# Firebase Authentication Backend

A comprehensive Node.js backend with Firebase Authentication and role-based access control.

## Features

- 🔥 Firebase Authentication integration
- 👥 Role-based access control (Admin, Manager, User)
- 🗄️ PostgreSQL database with user management
- 🔒 JWT token verification
- 📱 RESTful API endpoints
- 🧪 Test users for development
- 📚 Comprehensive API documentation

## User Roles

- **Admin**: Full system access, can manage all users and roles
- **Manager**: Can view all users but cannot modify roles or user status  
- **User**: Basic access, can only view their own profile

## Quick Start

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL database
- Firebase project with service account key

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment template:

```bash
copy .env.example .env
```

Update `.env` with your configuration:

```bash
# Database Configuration
DB_USER=your_db_username
DB_HOST=localhost
DB_NAME=your_database_name
DB_PASS=your_db_password
DB_PORT=5432

# Server Configuration
PORT=5000

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id

# Chatbot Configuration
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file and save it as `serviceAccountKey.json` in the project root

### 4. Database and Firebase Setup

Run the complete setup:

```bash
npm run setup-all
```

This will:
- Create database tables and indexes
- Insert default test users in database
- Create Firebase test users

### 5. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Test Users

The system automatically creates these test users for development:

| Email | Password | Role | Firebase UID |
|-------|----------|------|--------------|
| admin@gmail.com | admin | admin | admin-firebase-uid |
| manager@gmail.com | manager | manager | manager-firebase-uid |
| user@gmail.com | user | user | user-firebase-uid |

## API Endpoints

### Health Check
- `GET /health` - Check server status

### User Management
- `POST /api/users/register` - Register/login user
- `GET /api/users/profile` - Get current user profile
- `GET /api/users` - Get all users (Manager/Admin only)
- `PUT /api/users/:userId/role` - Update user role (Admin only)
- `PUT /api/users/:userId/deactivate` - Deactivate user (Admin only)
- `PUT /api/users/:userId/activate` - Activate user (Admin only)

### Chatbot (STELLARION Space Assistant)
- `POST /api/chatbot` - Chat completion endpoint
- `GET /api/chatbot/health` - Check chatbot service status

### Test Endpoints (Development Only)
- `POST /api/users/test-register` - Register without Firebase auth

## Authentication

All protected endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

## Testing the API

### 1. Using the Test HTML Page

Open `test-auth.html` in your browser and:
1. Update the Firebase config with your project details
2. Sign in with test credentials (admin@gmail.com / admin)
3. Copy the ID token
4. Use the token to test API endpoints

### 2. Using cURL

First get an ID token, then use it to call protected endpoints:

```bash
# Get user profile
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     http://localhost:5000/api/users/profile

# Get all users (Manager/Admin only)
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
     http://localhost:5000/api/users
```

### 3. Using Postman

1. Set Authorization header: `Bearer YOUR_ID_TOKEN`
2. Set Content-Type: `application/json`
3. Make requests to the API endpoints

## Frontend Integration

See `API_DOCUMENTATION.md` for comprehensive frontend integration guide including:

- Firebase setup
- Authentication service
- API service  
- React component examples
- Route protection
- Error handling

## Database Schema

```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role user_role DEFAULT 'user',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

```
├── controllers/
│   └── user.controller.ts      # User management logic
├── database/
│   └── schema.sql             # Database schema
├── middleware/
│   ├── errorHandler.ts        # Error handling middleware
│   ├── verifyToken.ts         # Firebase token verification
│   └── roleAuth.ts           # Role-based authorization
├── routes/
│   └── user.routes.ts         # User API routes
├── scripts/
│   ├── setup-database.js      # Database setup script
│   └── create-firebase-users.js # Firebase users creation
├── types/
│   └── index.ts              # TypeScript type definitions
├── db.ts                     # Database connection
├── firebaseAdmin.ts          # Firebase admin setup
├── index.ts                  # Main server file
└── test-auth.html           # Testing page
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run build` - Build TypeScript to JavaScript
- `npm run setup-db` - Set up database tables
- `npm run create-firebase-users` - Create Firebase test users
- `npm run setup-all` - Complete setup (database + Firebase users)

## Development

### Adding New Endpoints

1. Define types in `types/index.ts`
2. Create controller functions in `controllers/`
3. Add routes in `routes/`
4. Update documentation

### Role-Based Protection

Use the role middleware to protect endpoints:

```typescript
import { requireAdmin, requireManager, requireUser } from '../middleware/roleAuth';

// Admin only
router.put('/admin-endpoint', verifyToken, requireAdmin, controllerFunction);

// Manager or Admin
router.get('/manager-endpoint', verifyToken, requireManager, controllerFunction);

// Any authenticated user
router.get('/user-endpoint', verifyToken, requireUser, controllerFunction);
```

## Production Deployment

Before deploying to production:

1. **Remove test users and endpoints**
2. **Set up proper environment variables**
3. **Configure CORS for your frontend domain**
4. **Set up SSL/TLS certificates**
5. **Implement logging and monitoring**
6. **Set up database backups**
7. **Configure rate limiting**

## Security Considerations

- Never expose Firebase service account keys in client-side code
- Always validate Firebase ID tokens on the backend
- Implement proper CORS settings for production
- Use environment variables for sensitive configuration
- Validate and sanitize all user inputs
- Use HTTPS in production environments

## Troubleshooting

### Common Issues

1. **Database connection errors**: Check your `.env` configuration and ensure PostgreSQL is running
2. **Firebase authentication errors**: Verify your `serviceAccountKey.json` is correct and in the project root
3. **Token verification failures**: Ensure Firebase config matches between frontend and backend
4. **Permission denied errors**: Check user roles and endpoint permissions

### Logs

Check the console output for detailed error messages. The server logs all database operations and authentication attempts.

## Documentation

- [Complete API Documentation](API_DOCUMENTATION.md) - Detailed API reference with examples
- [Frontend Integration Guide](API_DOCUMENTATION.md#frontend-implementation-guide) - Step-by-step frontend setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## License

This project is licensed under the ISC License.
