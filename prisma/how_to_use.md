# Using Prisma in Controller Functions

This guide provides comprehensive examples of how to use Prisma ORM in your Express controller functions. Prisma provides a type-safe database client that makes database operations straightforward and secure.

## Table of Contents
- [Setup](#setup)
- [Basic CRUD Operations](#basic-crud-operations)
  - [Create Records](#create-records)
  - [Read Records](#read-records)
  - [Update Records](#update-records)
  - [Delete Records](#delete-records)
- [Advanced Queries](#advanced-queries)
  - [Filtering and Searching](#filtering-and-searching)
  - [Pagination](#pagination)
  - [Relationships](#relationships)
  - [Aggregations](#aggregations)
  - [Transactions](#transactions)
- [Error Handling](#error-handling)
- [Performance Tips](#performance-tips)

## Setup

To use Prisma in your controller, import the Prisma client and instantiate it:

```typescript
import { PrismaClient } from '../prisma/generated/client';
const prisma = new PrismaClient();
```

For production use, it's recommended to create a singleton instance of the Prisma client:

```typescript
// db.ts or prismaClient.ts
import { PrismaClient } from './prisma/generated/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

## Basic CRUD Operations

### Create Records

Creating a single record:

```typescript
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, role } = req.body;
    
    const newUser = await prisma.users.create({
      data: {
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        created_at: new Date(),
      },
    });
    
    res.status(201).json({
      success: true,
      data: newUser,
      message: "User created successfully"
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user"
    });
  }
};
```

Creating multiple records:

```typescript
const createManyUsers = await prisma.users.createMany({
  data: [
    { email: 'user1@example.com', first_name: 'User', last_name: 'One', role: 'learner' },
    { email: 'user2@example.com', first_name: 'User', last_name: 'Two', role: 'mentor' },
  ],
  skipDuplicates: true, // Skip records that conflict with existing records
});
```

### Read Records

Fetching all records:

```typescript
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.users.findMany();
    
    res.status(200).json({
      success: true,
      data: users,
      message: "Users retrieved successfully"
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users"
    });
  }
};
```

Fetching a single record by ID:

```typescript
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await prisma.users.findUnique({
      where: {
        id: parseInt(id),
      },
    });
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: "User retrieved successfully"
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user"
    });
  }
};
```

Fetching the first record that matches criteria:

```typescript
const user = await prisma.users.findFirst({
  where: {
    email: {
      contains: '@example.com',
    },
    role: 'mentor',
  },
});
```

### Update Records

Updating a single record:

```typescript
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;
    
    const updatedUser = await prisma.users.update({
      where: {
        id: parseInt(id),
      },
      data: {
        first_name: firstName,
        last_name: lastName,
        email,
        updated_at: new Date(),
      },
    });
    
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user"
    });
  }
};
```

Updating multiple records:

```typescript
const updateManyUsers = await prisma.users.updateMany({
  where: {
    role: 'learner',
  },
  data: {
    updated_at: new Date(),
  },
});
```

Updating a record or creating it if it doesn't exist (upsert):

```typescript
const upsertUser = await prisma.users.upsert({
  where: {
    email: 'user@example.com',
  },
  update: {
    last_name: 'Updated',
  },
  create: {
    email: 'user@example.com',
    first_name: 'New',
    last_name: 'User',
    role: 'learner',
  },
});
```

### Delete Records

Deleting a single record:

```typescript
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.users.delete({
      where: {
        id: parseInt(id),
      },
    });
    
    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user"
    });
  }
};
```

Deleting multiple records:

```typescript
const deleteManyUsers = await prisma.users.deleteMany({
  where: {
    role: 'learner',
    created_at: {
      lt: new Date('2023-01-01'),
    },
  },
});
```

## Advanced Queries

### Filtering and Searching

Basic filtering:

```typescript
export const searchUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, query } = req.query;
    
    const users = await prisma.users.findMany({
      where: {
        role: role ? String(role) : undefined,
        OR: query ? [
          { first_name: { contains: String(query), mode: 'insensitive' } },
          { last_name: { contains: String(query), mode: 'insensitive' } },
          { email: { contains: String(query), mode: 'insensitive' } },
        ] : undefined,
      },
    });
    
    res.status(200).json({
      success: true,
      data: users,
      message: "Users found successfully"
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users"
    });
  }
};
```

Advanced filtering with AND, OR conditions:

```typescript
const filteredUsers = await prisma.users.findMany({
  where: {
    AND: [
      {
        OR: [
          { role: 'mentor' },
          { role: 'admin' },
        ],
      },
      {
        created_at: {
          gte: new Date('2023-01-01'),
        },
      },
    ],
  },
});
```

### Pagination

Implementing pagination:

```typescript
export const getUsersWithPagination = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Get total count for pagination metadata
    const totalCount = await prisma.users.count();
    
    // Get users with pagination
    const users = await prisma.users.findMany({
      skip,
      take: limitNumber,
      orderBy: {
        created_at: 'desc',
      },
    });
    
    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber),
      },
      message: "Users retrieved successfully"
    });
  } catch (error) {
    console.error("Get users with pagination error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users"
    });
  }
};
```

### Relationships

Including related records:

```typescript
export const getUserWithSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const userWithSubscriptions = await prisma.users.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        subscriptions: true, // Include all subscriptions
      },
    });
    
    if (!userWithSubscriptions) {
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: userWithSubscriptions,
      message: "User with subscriptions retrieved successfully"
    });
  } catch (error) {
    console.error("Get user with subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user with subscriptions"
    });
  }
};
```

Nested includes with filtering:

```typescript
const userWithActiveSubscriptions = await prisma.users.findUnique({
  where: {
    id: userId,
  },
  include: {
    subscriptions: {
      where: {
        status: 'active',
      },
      include: {
        payments: true, // Include payments for each subscription
      },
    },
  },
});
```

### Aggregations

Performing count, sum, avg, min, max operations:

```typescript
export const getUserStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Count users by role
    const usersByRole = await prisma.users.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });
    
    // Get total blog views by user
    const blogViewsByUser = await prisma.blog_views.groupBy({
      by: ['user_id'],
      _count: {
        id: true,
      },
    });
    
    res.status(200).json({
      success: true,
      data: {
        usersByRole,
        blogViewsByUser,
      },
      message: "User statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user statistics"
    });
  }
};
```

### Transactions

Using transactions for multiple operations:

```typescript
export const createUserWithSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, role, planType } = req.body;
    
    const result = await prisma.$transaction(async (prisma) => {
      // Create the user
      const user = await prisma.users.create({
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
          role,
        },
      });
      
      // Create subscription for the user
      const subscription = await prisma.subscriptions.create({
        data: {
          user_id: user.id,
          plan_type: planType,
          start_date: new Date(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month from now
          status: 'active',
        },
      });
      
      return { user, subscription };
    });
    
    res.status(201).json({
      success: true,
      data: result,
      message: "User with subscription created successfully"
    });
  } catch (error) {
    console.error("Create user with subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user with subscription"
    });
  }
};
```

## Error Handling

Proper error handling with Prisma:

```typescript
export const updateUserSafely = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName } = req.body;
    
    const updatedUser = await prisma.users.update({
      where: {
        id: parseInt(id),
      },
      data: {
        email,
        first_name: firstName,
        last_name: lastName,
      },
    });
    
    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "User updated successfully"
    });
  } catch (error) {
    // Handle specific Prisma errors
    if (error.code === 'P2025') {
      // Record not found
      res.status(404).json({
        success: false,
        message: "User not found"
      });
      return;
    }
    if (error.code === 'P2002') {
      // Unique constraint violation
      res.status(400).json({
        success: false,
        message: `Email already in use`
      });
      return;
    }
    
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
```

## Performance Tips

1. **Select specific fields** to reduce data transfer:

```typescript
const users = await prisma.users.findMany({
  select: {
    id: true,
    email: true,
    first_name: true,
    last_name: true,
  },
});
```

2. **Use cursor-based pagination** for large datasets:

```typescript
const users = await prisma.users.findMany({
  take: 10,
  cursor: { id: lastUserId },
  orderBy: { id: 'asc' },
});
```

3. **Create indexes** for frequently queried fields in your schema:

```prisma
model users {
  id         Int     @id @default(autoincrement())
  email      String  @unique
  first_name String?
  last_name  String?
  role       String

  @@index([role])
}
```

4. **Use raw queries** for complex operations:

```typescript
const result = await prisma.$queryRaw`
  SELECT u.id, u.email, COUNT(s.id) as subscription_count
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  GROUP BY u.id, u.email
  ORDER BY subscription_count DESC
  LIMIT 10
`;
```

5. **Batch operations** when possible:

```typescript
// Instead of multiple separate operations
await Promise.all([
  prisma.users.updateMany({ /* ... */ }),
  prisma.subscriptions.updateMany({ /* ... */ }),
]);
```

## Common CLI Commands

```bash
# Generate Prisma client
npx prisma generate

# Pull database schema (introspect)
npx prisma db pull

# Push schema changes to the database
npx prisma db push

# Create a migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio
```