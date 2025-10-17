# 📝 Swagger Documentation Cheat Sheet

## Quick Copy-Paste Templates

### 🔓 Public GET Endpoint
```typescript
/**
 * @swagger
 * /api/resource:
 *   get:
 *     summary: Get all resources
 *     tags: [ResourceName]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
```

### 🔒 Protected GET by ID
```typescript
/**
 * @swagger
 * /api/resource/{id}:
 *   get:
 *     summary: Get resource by ID
 *     tags: [ResourceName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
```

### ➕ POST with Body
```typescript
/**
 * @swagger
 * /api/resource:
 *   post:
 *     summary: Create new resource
 *     tags: [ResourceName]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - field1
 *               - field2
 *             properties:
 *               field1:
 *                 type: string
 *                 example: "value1"
 *               field2:
 *                 type: string
 *                 example: "value2"
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
```

### ✏️ PUT/PATCH Update
```typescript
/**
 * @swagger
 * /api/resource/{id}:
 *   put:
 *     summary: Update resource
 *     tags: [ResourceName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field1:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
```

### 🗑️ DELETE
```typescript
/**
 * @swagger
 * /api/resource/{id}:
 *   delete:
 *     summary: Delete resource
 *     tags: [ResourceName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
```

### 📤 File Upload
```typescript
/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: "https://cdn.example.com/file.jpg"
 */
```

---

## Common Parameter Types

### Path Parameters
```typescript
parameters:
  - in: path
    name: id
    required: true
    schema:
      type: integer
    description: Resource ID
```

### Query Parameters
```typescript
parameters:
  - in: query
    name: search
    schema:
      type: string
    description: Search term
  - in: query
    name: sort
    schema:
      type: string
      enum: [asc, desc]
      default: asc
```

### Header Parameters
```typescript
parameters:
  - in: header
    name: X-Custom-Header
    schema:
      type: string
    required: true
```

---

## Common Data Types

### String Types
```typescript
type: string
type: string
format: email
type: string
format: date-time
type: string
format: uri
type: string
format: uuid
```

### Number Types
```typescript
type: integer
type: number
type: number
format: float
type: number
format: double
```

### Other Types
```typescript
type: boolean
type: array
items:
  type: string
type: object
properties:
  key: value
```

---

## Schema References

### Define Schema in swagger.config.ts
```typescript
components: {
  schemas: {
    User: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        email: { type: 'string', format: 'email' },
        full_name: { type: 'string' }
      }
    }
  }
}
```

### Reference Schema in Route
```typescript