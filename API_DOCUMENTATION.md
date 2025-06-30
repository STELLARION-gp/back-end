# Firebase Authentication Backend API Documentation

## Overview

This backend provides a comprehensive user authentication and authorization system using Firebase Authentication with role-based access control. The system supports three user roles: `admin`, `manager`, and `user`.

## User Roles

- **Admin**: Full system access, can manage all users and roles
- **Manager**: Can view all users but cannot modify roles or user status
- **User**: Basic access, can only view their own profile

## Default Test Users

For development and testing purposes, the following users are automatically created:

| Email | Password | Role | Firebase UID |
|-------|----------|------|--------------|
| admin@gmail.com | admin | admin | admin-firebase-uid |
| manager@gmail.com | manager | manager | manager-firebase-uid |
| user@gmail.com | user | user | user-firebase-uid |

**Note**: In production, these test users should be removed and proper Firebase authentication should be used.

## API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Authentication

All protected endpoints require a Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase_id_token>
```

### Health Check

#### GET /health
Check if the server is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### User Management

#### POST /api/users/register
Register a new user or login an existing user.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firebaseUser": {
    "uid": "firebase_user_id",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "role": "user",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201 - New User):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

**Response (200 - Existing User):**
```json
{
  "message": "User already exists",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

#### GET /api/users/profile
Get the current user's profile.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Required Role:** user, manager, admin

**Response:**
```json
{
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

#### GET /api/users
Get all users with pagination and filtering.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Required Role:** manager, admin

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `role` (optional): Filter by role (admin, manager, user)
- `search` (optional): Search in email, first_name, last_name

**Example:**
```
GET /api/users?page=1&limit=5&role=user&search=john
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "firebase_uid": "firebase_user_id",
      "email": "user@example.com",
      "role": "user",
      "first_name": "John",
      "last_name": "Doe",
      "is_active": true,
      "last_login": "2025-06-30T10:00:00.000Z",
      "created_at": "2025-06-30T10:00:00.000Z",
      "updated_at": "2025-06-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "pages": 1
  }
}
```

#### PUT /api/users/:userId/role
Update a user's role.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Required Role:** admin

**Request Body:**
```json
{
  "role": "manager"
}
```

**Response:**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "manager",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

#### PUT /api/users/:userId/deactivate
Deactivate a user account.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Required Role:** admin

**Response:**
```json
{
  "message": "User deactivated successfully",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": false,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

#### PUT /api/users/:userId/activate
Activate a user account.

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

**Required Role:** admin

**Response:**
```json
{
  "message": "User activated successfully",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_id",
    "email": "user@example.com",
    "role": "user",
    "first_name": "John",
    "last_name": "Doe",
    "is_active": true,
    "last_login": "2025-06-30T10:00:00.000Z",
    "created_at": "2025-06-30T10:00:00.000Z",
    "updated_at": "2025-06-30T10:00:00.000Z"
  }
}
```

### Test Endpoint (Development Only)

#### POST /api/users/test-register
Register a user without Firebase authentication (for testing purposes).

**Request Body:**
```json
{
  "firebaseUser": {
    "uid": "test-firebase-uid",
    "email": "test@example.com",
    "name": "Test User"
  },
  "role": "user"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing firebaseUser data (uid and email required)"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": ["admin"],
  "current": "user"
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Frontend Implementation Guide

### 1. Firebase Setup

First, install Firebase SDK in your frontend project:

```bash
npm install firebase
```

### 2. Firebase Configuration

Create a Firebase configuration file:

```javascript
// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
```

### 3. Authentication Service

Create an authentication service:

```javascript
// authService.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './firebase';

const API_BASE_URL = 'http://localhost:5000/api';

class AuthService {
  // Sign in with email and password
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Register/login with backend
      await this.registerWithBackend(idToken);
      
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Sign up with email and password
  async signUp(email, password, firstName = '', lastName = '') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken();
      
      // Register with backend
      await this.registerWithBackend(idToken, firstName, lastName);
      
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  // Register with backend
  async registerWithBackend(idToken, firstName = '', lastName = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          firebaseUser: {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            name: auth.currentUser.displayName || `${firstName} ${lastName}`.trim()
          },
          first_name: firstName,
          last_name: lastName
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register with backend');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }

  // Get current user ID token
  async getCurrentUserToken() {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    return null;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export default new AuthService();
```

### 4. API Service

Create an API service for backend communication:

```javascript
// apiService.js
import authService from './authService';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  // Make authenticated request
  async makeRequest(endpoint, options = {}) {
    try {
      const token = await authService.getCurrentUserToken();
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getUserProfile() {
    return this.makeRequest('/users/profile');
  }

  // Get all users (admin/manager only)
  async getAllUsers(page = 1, limit = 10, role = '', search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(role && { role }),
      ...(search && { search })
    });
    
    return this.makeRequest(`/users?${params}`);
  }

  // Update user role (admin only)
  async updateUserRole(userId, role) {
    return this.makeRequest(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  }

  // Deactivate user (admin only)
  async deactivateUser(userId) {
    return this.makeRequest(`/users/${userId}/deactivate`, {
      method: 'PUT'
    });
  }

  // Activate user (admin only)
  async activateUser(userId) {
    return this.makeRequest(`/users/${userId}/activate`, {
      method: 'PUT'
    });
  }
}

export default new ApiService();
```

### 5. React Component Examples

#### Login Component
```jsx
// components/Login.jsx
import React, { useState } from 'react';
import authService from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.signIn(email, password);
      // Redirect to dashboard or handle success
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
};

export default Login;
```

#### User Management Component (Admin)
```jsx
// components/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, [page, search, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllUsers(page, 10, roleFilter, search);
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiService.updateUserRole(userId, newRole);
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleUserToggle = async (userId, isActive) => {
    try {
      if (isActive) {
        await apiService.deactivateUser(userId);
      } else {
        await apiService.activateUser(userId);
      }
      loadUsers(); // Refresh the list
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>User Management</h2>
      
      <div>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
      </div>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim()}</td>
              <td>
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
              <td>
                <button
                  onClick={() => handleUserToggle(user.id, user.is_active)}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserManagement;
```

### 6. Route Protection

Create a protected route component:

```jsx
// components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import apiService from '../services/apiService';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profile = await apiService.getUserProfile();
          setUserProfile(profile.user);
        } catch (error) {
          console.error('Failed to get user profile:', error);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to access this page.</div>;
  }

  if (requiredRole && userProfile && !hasRequiredRole(userProfile.role, requiredRole)) {
    return <div>You don't have permission to access this page.</div>;
  }

  return children;
};

const hasRequiredRole = (userRole, requiredRole) => {
  const roleHierarchy = {
    'user': 1,
    'manager': 2,
    'admin': 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

export default ProtectedRoute;
```

## Environment Setup

### 1. Backend Environment Variables

Create a `.env` file in your backend project:

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
```

### 2. Firebase Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key
3. Download the JSON file and save it as `serviceAccountKey.json` in your backend root directory

### 3. Database Setup

Run the database setup script:

```bash
npm run setup-db
```

## Development Workflow

### 1. Start the Backend
```bash
npm run dev
```

### 2. Test with Default Users

You can test the API with the default users:
- Admin: admin@gmail.com / admin
- Manager: manager@gmail.com / manager  
- User: user@gmail.com / user

### 3. Frontend Integration

Use the provided code examples to integrate with your frontend application. Make sure to:

1. Set up Firebase configuration with your project credentials
2. Implement the authentication service
3. Create protected routes based on user roles
4. Handle authentication states properly

## Security Considerations

1. **Never expose Firebase service account keys** in client-side code
2. **Always validate Firebase ID tokens** on the backend
3. **Implement proper CORS** settings for production
4. **Remove test endpoints** in production
5. **Use environment variables** for sensitive configuration
6. **Implement rate limiting** for API endpoints
7. **Validate all user inputs** and sanitize data
8. **Use HTTPS** in production environments

## Production Deployment

Before deploying to production:

1. Remove test users and endpoints
2. Set up proper environment variables
3. Configure CORS for your frontend domain
4. Set up SSL/TLS certificates
5. Implement logging and monitoring
6. Set up backup strategies for your database
7. Consider implementing rate limiting and API quotas
