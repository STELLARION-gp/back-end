# Stellarion Backend API

A robust Node.js/Express TypeScript backend API with Firebase Authentication and PostgreSQL database integration. This API provides user management functionality with secure authentication and data persistence.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development Guidelines](#development-guidelines)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **RESTful API** with Express.js and TypeScript
- **Firebase Authentication** integration with JWT token validation
- **PostgreSQL** database with connection pooling
- **CORS** enabled for cross-origin requests
- **Environment-based** configuration
- **Error handling** middleware with structured error responses
- **Database migrations** and schema management
- **Type-safe** development with TypeScript
- **Hot reload** development environment
- **Structured logging** and debugging

## 🛠 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 16+ | Runtime environment |
| **TypeScript** | ^5.8.3 | Type-safe JavaScript |
| **Express.js** | ^5.1.0 | Web framework |
| **PostgreSQL** | 12+ | Primary database |
| **Firebase Admin** | ^13.4.0 | Authentication & authorization |
| **pg** | ^8.16.1 | PostgreSQL client |
| **ts-node-dev** | ^2.0.0 | Development server |
| **dotenv** | ^16.5.0 | Environment configuration |
| **cors** | ^2.8.5 | Cross-origin resource sharing |

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16.0.0 or higher)
- **npm** (v7.0.0 or higher)
- **PostgreSQL** (v12.0.0 or higher)
- **Firebase Project** with Admin SDK setup

### System Requirements

- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Type Definitions

```bash
npm install --save-dev @types/pg
```

## ⚙️ Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your configuration:

```env
# Database Configuration
DB_USER=your_database_username
DB_HOST=your_database_host
DB_NAME=your_database_name
DB_PASS=your_database_password
DB_PORT=5432

# Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=stellarion-b76d6
```

### 3. Firebase Service Account Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`stellarion-b76d6`)
3. Navigate to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in the project root

⚠️ **Security Note**: Never commit `serviceAccountKey.json` to version control.

## 🗄️ Database Setup

### 1. Create PostgreSQL Database

```sql
CREATE DATABASE stellarion;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE stellarion TO your_username;
```

### 2. Run Database Migration

```bash
npm run setup-db
```

This will create:
- `users` table with proper schema
- Database indexes for performance
- Triggers for automatic timestamp updates

### 3. Verify Database Setup

The setup script will confirm successful table creation and show the current user count.

## 🏃‍♂️ Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5432` with hot reload enabled.

### Production Mode

```bash
npm start
```

### Build for Production

```bash
npm run build
npm run build:watch  # For continuous building
```

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `npm run dev` | Start development server with hot reload |
| `start` | `npm start` | Start production server |
| `build` | `npm run build` | Compile TypeScript to JavaScript |
| `build:watch` | `npm run build:watch` | Watch mode compilation |
| `setup-db` | `npm run setup-db` | Initialize database schema |
| `test` | `npm test` | Run test suite (to be implemented) |

## 📚 API Documentation

### Base URL

```
http://localhost:5432/api
```

### Authentication

All protected endpoints require a Firebase ID Token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### Endpoints

#### Health Check

**GET** `/health`

Check API health status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-06-26T10:30:00.000Z"
}
```

#### User Registration

**POST** `/api/users/register`

Create a new user or return existing user data.

**Headers:**
```http
Content-Type: application/json
Authorization: Bearer <firebase_id_token>
```

**Request Body:**
```json
{
  "firebaseUser": {
    "uid": "firebase_user_uid",
    "email": "user@example.com"
  }
}
```

**Response (201 - Created):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_uid",
    "email": "user@example.com",
    "created_at": "2025-06-26T10:30:00.000Z",
    "updated_at": "2025-06-26T10:30:00.000Z"
  }
}
```

**Response (200 - Existing User):**
```json
{
  "message": "User already exists",
  "user": {
    "id": 1,
    "firebase_uid": "firebase_user_uid",
    "email": "user@example.com",
    "created_at": "2025-06-26T10:30:00.000Z",
    "updated_at": "2025-06-26T10:30:00.000Z"
  }
}
```

#### Test Registration (Development Only)

**POST** `/api/users/test-register`

Test endpoint without authentication (remove in production).

**Headers:**
```http
Content-Type: application/json
```

**Request Body:**
```json
{
  "firebaseUser": {
    "uid": "test_user_123",
    "email": "test@example.com"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Missing firebaseUser data (uid and email required)"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Database error"
}
```

#### 404 Not Found
```json
{
  "error": {
    "message": "Not found - /invalid-endpoint",
    "status": 404
  }
}
```

## 📁 Project Structure

```
backend/
├── controllers/              # Request handlers and business logic
│   └── user.controller.ts   # User-related operations
├── middleware/              # Express middleware functions
│   ├── verifyToken.ts      # Firebase token verification
│   └── errorHandler.ts     # Global error handling
├── routes/                 # API route definitions
│   └── user.routes.ts     # User-related routes
├── types/                 # TypeScript type definitions
│   └── index.ts          # Shared interfaces and types
├── scripts/              # Database and utility scripts
│   └── setup-database.js # Database initialization
├── database/            # Database schema and migrations
│   └── schema.sql      # PostgreSQL schema definition
├── db.ts               # Database connection configuration
├── firebaseAdmin.ts    # Firebase Admin SDK setup
├── index.ts           # Application entry point
├── package.json       # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── .env.example     # Environment variables template
├── .gitignore      # Git ignore rules
└── README.md      # Project documentation
```

### File Descriptions

| File/Directory | Purpose |
|----------------|---------|
| `controllers/` | Contains business logic and request handlers |
| `middleware/` | Custom Express middleware functions |
| `routes/` | API endpoint definitions and routing |
| `types/` | TypeScript interfaces and type definitions |
| `scripts/` | Utility scripts for database setup and maintenance |
| `db.ts` | PostgreSQL connection pool configuration |
| `firebaseAdmin.ts` | Firebase Admin SDK initialization |
| `index.ts` | Main application server setup |

## 👨‍💻 Development Guidelines

### Code Style

- Use **TypeScript** for all new files
- Follow **camelCase** naming convention
- Use **async/await** instead of promises
- Include proper **error handling** in all functions
- Add **JSDoc comments** for complex functions

### Database Guidelines

- Use **parameterized queries** to prevent SQL injection
- Include proper **error handling** for database operations
- Use **transactions** for multi-step operations
- Follow **PostgreSQL naming conventions**

### Security Best Practices

- **Never** commit sensitive files (`serviceAccountKey.json`, `.env`)
- **Always** validate input data
- Use **Firebase Admin SDK** for server-side authentication
- Implement **proper error handling** without exposing internal details
- Use **HTTPS** in production

### Git Workflow

1. Create feature branches: `git checkout -b feature/feature-name`
2. Make atomic commits with clear messages
3. Test thoroughly before pushing
4. Create pull requests for code review
5. Merge only after approval

## 🧪 Testing

### Manual Testing with Postman

1. **Import** the provided Postman collection (if available)
2. **Set environment variables** for base URL and tokens
3. **Test health endpoint** first to verify server status
4. **Test user registration** with valid Firebase tokens

### Testing Endpoints

```bash
# Health check
curl -X GET http://localhost:5432/health

# Test registration (development only)
curl -X POST http://localhost:5432/api/users/test-register \
  -H "Content-Type: application/json" \
  -d '{"firebaseUser":{"uid":"test123","email":"test@example.com"}}'
```

### Getting Firebase ID Tokens

1. Use the provided `test-auth.html` file
2. Configure with your Firebase project settings
3. Sign in and copy the generated token
4. Use token in Authorization header

## 🚀 Deployment

### Environment Setup

1. **Set production environment variables**
2. **Configure production database**
3. **Set up Firebase project for production**
4. **Configure CORS** for production domains

### Production Checklist

- [ ] Remove test endpoints (`/test-register`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Docker Deployment (Optional)

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

## 🤝 Contributing

### Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** thoroughly
6. **Submit** a pull request

### Code Review Process

1. All changes require **peer review**
2. **Automated tests** must pass
3. **Code style** must be consistent
4. **Documentation** must be updated

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: connect ECONNREFUSED
```
**Solution**: Check database credentials and network connectivity.

#### Firebase Authentication Error
```
Error: Invalid token
```
**Solution**: Verify Firebase project configuration and token validity.

#### Table Does Not Exist
```
Error: relation "users" does not exist
```
**Solution**: Run `npm run setup-db` to create database schema.

#### Port Already in Use
```
Error: EADDRINUSE :::5432
```
**Solution**: Change PORT in `.env` or kill the process using the port.

### Debugging

1. **Check server logs** for detailed error messages
2. **Verify environment variables** are loaded correctly
3. **Test database connection** using the setup script
4. **Validate Firebase configuration** and service account key

### Getting Help

1. Check this documentation first
2. Search existing issues in the repository
3. Create a new issue with detailed information
4. Include error logs and steps to reproduce

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 📞 Support

For questions and support:
- **Email**: [your-email@domain.com]
- **Issue Tracker**: [Repository Issues URL]
- **Documentation**: [Documentation URL]

---

**Last Updated**: June 26, 2025  
**Version**: 1.0.0
