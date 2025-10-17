# 📚 Complete Swagger API Documentation Setup Guide

## 🎯 Overview

This guide will walk you through adding comprehensive Swagger/OpenAPI documentation to your STELLARION backend.

---

## 📋 Prerequisites

- Node.js and npm installed
- TypeScript backend running
- Basic understanding of REST APIs

---

## 🚀 Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

### Step 2: Create Swagger Configuration

Create a new file: `swagger.config.ts` in your root directory (use the artifact provided above).

### Step 3: Update index.ts

Add these lines to your `index.ts`:

```typescript
// Add imports at the top
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.config';

// Add AFTER middleware but BEFORE routes (around line 70)
// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'STELLARION API Docs',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

### Step 4: Update package.json Scripts

Add these convenient scripts:

```json
{
  "scripts": {
    "generate-swagger": "npx ts-node generate-swagger-templates.ts",
    "docs": "npm run dev & open http://localhost:5000/api-docs"
  }
}
```

### Step 5: Document Your Routes

For each route file, add JSDoc comments above the route definitions. Here's the pattern:

#### Basic Template

```typescript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Brief description
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []  // For protected routes
 *     responses:
 *       200:
 *         description: Success response
 */
router.get('/your-endpoint', controller);
```

#### With Parameters

```typescript
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: Get item by ID
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *       - in: query
 *         name: include
 *         schema:
 *           type: string
 *         description: Include related data
 */
```

#### With Request Body

```typescript
/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Create new item
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 example: "My Item"
 *               description:
 *                 type: string
 *                 example: "Item description"
 */
```

---

## 📝 Documentation Checklist for All Routes

### ✅ Authentication Routes (`auth.routes.ts`)
- [x] POST /api/auth/register
- [x] POST /api/auth/login
- [x] POST /api/auth/verify-email
- [x] POST /api/auth/reset-password
- [x] POST /api/auth/logout

### ✅ User Routes (`user.routes.ts`)
- [ ] GET /api/users
- [ ] GET /api/users/:id
- [ ] PUT /api/users/:id
- [ ] DELETE /api/users/:id

### ✅ Profile Routes (`profile.routes.ts`)
- [ ] GET /api/user/profile
- [ ] PUT /api/user/profile
- [ ] POST /api/user/avatar

### ✅ Chatbot Routes (`chatbot.routes.ts`)
- [x] POST /api/chatbot/chat
- [x] GET /api/chatbot/sessions
- [x] GET /api/chatbot/sessions/:id
- [x] DELETE /api/chatbot/sessions/:id
- [x] GET /api/chatbot/usage

### ✅ Blog Routes (`blog.routes.ts`)
- [x] GET /api/blogs
- [x] GET /api/blogs/:id
- [x] POST /api/blogs
- [x] PUT /api/blogs/:id
- [x] DELETE /api/blogs/:id
- [x] POST /api/blogs/:id/like
- [x] POST /api/blogs/:id/comments

### ✅ Subscription Routes (`subscription.routes.ts`)
- [ ] GET /api/subscriptions/plans
- [ ] POST /api/subscriptions/subscribe
- [ ] GET /api/subscriptions/current
- [ ] POST /api/subscriptions/cancel
- [ ] POST /api/subscriptions/upgrade

### ✅ Payment Routes (`payment.routes.ts`)
- [ ] POST /api/payments/create-intent
- [ ] POST /api/payments/confirm
- [ ] GET /api/payments/history

### ✅ Space News Routes (`spaceNews.routes.ts`)
- [ ] GET /api/space-news
- [ ] GET /api/space-news/:id
- [ ] POST /api/space-news
- [ ] PUT /api/space-news/:id
- [ ] DELETE /api/space-news/:id
- [ ] POST /api/space-news/:id/like
- [ ] POST /api/space-news/:id/comments

### ✅ Space Discussion Routes (`spaceDiscussion.routes.ts`)
- [ ] GET /api/space-discussions
- [ ] GET /api/space-discussions/:id
- [ ] POST /api/space-discussions
- [ ] POST /api/space-discussions/:id/like
- [ ] POST /api/space-discussions/:id/comments

### ✅ Astronomy Events Routes (`astronomyEvents.routes.ts`)
- [ ] GET /api/astronomy-events
- [ ] GET /api/astronomy-events/:id
- [ ] POST /api/astronomy-events
- [ ] PUT /api/astronomy-events/:id
- [ ] DELETE /api/astronomy-events/:id

### ✅ Stargazing Spots Routes (`stargazingSpot.routes.ts`)
- [ ] GET /api/stargazing-spots
- [ ] GET /api/stargazing-spots/:id
- [ ] POST /api/stargazing-spots
- [ ] POST /api/stargazing-spots/:id/review

### ✅ Sessions Routes (`sessions.routes.ts`)
- [ ] GET /api/sessions
- [ ] GET /api/sessions/:id
- [ ] POST /api/sessions
- [ ] POST /api/sessions/:id/enroll
- [ ] DELETE /api/sessions/:id/unenroll

### ✅ Poll Routes (`poll.routes.ts`)
- [ ] GET /api/polls
- [ ] GET /api/polls/:id
- [ ] POST /api/polls
- [ ] POST /api/polls/:id/vote
- [ ] POST /api/polls/:id/comments

### ✅ Night Camp Routes (`nightcamp.routes.ts`)
- [ ] GET /api/nightcamps
- [ ] GET /api/nightcamps/:id
- [ ] POST /api/nightcamps
- [ ] POST /api/nightcamps/:id/register

### ✅ NASA Opportunities Routes (`nasaOpportunities.routes.ts`)
- [ ] GET /api/nasa-opportunities
- [ ] GET /api/nasa-opportunities/:id

### ✅ Upload Routes (`upload.routes.ts`)
- [ ] POST /api/upload/image
- [ ] POST /api/upload/video
- [ ] DELETE /api/upload/:id

### ✅ Application Routes
- [ ] POST /api/mentor-applications
- [ ] POST /api/influencer-applications
- [ ] POST /api/guide-applications
- [ ] GET /api/*-applications/status

### ✅ Chat Routes (`chat.routes.ts`)
- [ ] GET /api/chat/groups
- [ ] POST /api/chat/groups
- [ ] GET /api/chat/messages/:groupId
- [ ] POST /api/chat/messages

---

## 🎨 Best Practices

### 1. Use Meaningful Tags
Group related endpoints under the same tag:
```typescript
tags: [Authentication]  // All auth endpoints
tags: [Blogs]          // All blog endpoints
tags: [Users]          // All user endpoints
```

### 2. Define Reusable Schemas
In `swagger.config.ts`, add common schemas:
```typescript
components: {
  schemas: {
    Error: { /* error schema */ },
    User: { /* user schema */ },
    PaginatedResponse: { /* pagination schema */ }
  }
}
```

### 3. Document All Response Codes
```typescript
responses:
  200:
    description: Success
  400:
    description: Bad Request
  401:
    description: Unauthorized
  404:
    description: Not Found
  500:
    description: Server Error
```

### 4. Include Examples
```typescript
properties:
  email:
    type: string
    format: email
    example: "user@stellarion.com"
```

### 5. Mark Required Fields
```typescript
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - email
          - password
```

---

## 🧪 Testing Your Documentation

### 1. Start the Server
```bash
npm run dev
```

### 2. Access Swagger UI
Open your browser to: `http://localhost:5000/api-docs`

### 3. Test Endpoints
1. Click on an endpoint
2. Click "Try it out"
3. Fill in parameters
4. Click "Execute"

### 4. Authenticate
1. Click the "Authorize" button (🔒)
2. Enter your JWT token
3. Click "Authorize"

---

## 🔧 Troubleshooting

### Issue: Swagger UI not loading
**Solution:** Check that swagger packages are installed and imported correctly.

### Issue: Routes not appearing
**Solution:** Ensure the `apis` path in `swagger.config.ts` matches your route files location:
```typescript
apis: ['./routes/*.ts', './routes/*.routes.ts']
```

### Issue: Schema not found
**Solution:** Define the schema in `swagger.config.ts` under `components.schemas`.

### Issue: Authentication not working
**Solution:** Ensure `bearerAuth` is defined in security schemes and applied to protected routes.

---

## 📊 Progress Tracking

Use this command to check documentation coverage:

```bash
# Count documented endpoints
grep -r "@swagger" routes/ | wc -l

# Count total route definitions
grep -r "router\." routes/ | wc -l
```

---

## 🎯 Quick Win Strategy

### Phase 1: Core Routes (Day 1)
1. Authentication routes ✅
2. User routes
3. Chatbot routes ✅

### Phase 2: Content Routes (Day 2)
1. Blog routes ✅
2. Space News routes
3. Space Discussion routes

### Phase 3: Feature Routes (Day 3)
1. Astronomy Events
2. Stargazing Spots
3. Sessions
4. Polls

### Phase 4: Additional Routes (Day 4)
1. Upload routes
2. Payment routes
3. Application routes
4. Night camps

---

## 📖 Example Workflow

1. **Pick a route file** (e.g., `user.routes.ts`)
2. **Copy template** from artifacts above
3. **Customize** for your specific endpoint
4. **Test** in Swagger UI
5. **Iterate** based on feedback
6. **Move to next route**

---

## 🚀 Advanced Features

### Custom Swagger Theme
```typescript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background-color: #1a1a2e; }
    .swagger-ui .info .title { color: #00d4ff; }
  `,
  customSiteTitle: 'STELLARION API',
  customfavIcon: '/favicon.ico'
}));
```

### Export Swagger JSON
Access `http://localhost:5000/api-docs.json` to get the raw OpenAPI spec.

### Generate Client SDKs
Use tools like `openapi-generator` to create client libraries:
```bash
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:5000/api-docs.json \
  -g typescript-axios \
  -o ./client-sdk
```

---

## ✅ Completion Checklist

- [ ] Install dependencies
- [ ] Create swagger.config.ts
- [ ] Update index.ts
- [ ] Document auth routes
- [ ] Document user routes
- [ ] Document chatbot routes
- [ ] Document blog routes
- [ ] Document all remaining routes
- [ ] Test all endpoints in Swagger UI
- [ ] Add examples to all schemas
- [ ] Document error responses
- [ ] Add authentication to protected routes
- [ ] Review and polish documentation

---

## 🎓 Resources

- [Swagger/OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
- [OpenAPI Examples](https://swagger.io/docs/specification/examples/)

---

## 💡 Pro Tips

1. **Document as you code** - Add Swagger docs when creating new routes
2. **Use snippets** - Create VS Code snippets for common patterns
3. **Keep it DRY** - Reference schemas instead of repeating definitions
4. **Test regularly** - Check Swagger UI after each route documentation
5. **Get feedback** - Share with frontend team for improvements

---
