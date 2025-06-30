# Sample Database Queries for User Management

## ✅ Complete Setup Applied

The database has been successfully updated with all 7 user roles and comprehensive sample data.

## 📊 Current Database State

**Total Users**: 25 (23 active, 2 inactive)

**Users by Role**:
- **Admin**: 2 users
- **Moderator**: 3 users  
- **Mentor**: 3 users
- **Influencer**: 3 users
- **Guide**: 3 users
- **Enthusiast**: 4 users
- **Learner**: 5 users

## 🔑 Primary Test Users

| Role | Email | Password | Firebase UID |
|------|-------|----------|--------------|
| Admin | admin@gmail.com | admin | admin-firebase-uid-001 |
| Moderator | moderator@gmail.com | moderator | moderator-firebase-uid-001 |
| Mentor | mentor@gmail.com | mentor | mentor-firebase-uid-001 |
| Influencer | influencer@gmail.com | influencer | influencer-firebase-uid-001 |
| Guide | guide@gmail.com | guide | guide-firebase-uid-001 |
| Enthusiast | enthusiast@gmail.com | enthusiast | enthusiast-firebase-uid-001 |
| Learner | learner@gmail.com | learner | learner-firebase-uid-001 |

## 🗄️ Useful SQL Queries

### View All Users by Role
```sql
SELECT 
    role,
    COUNT(*) as user_count,
    STRING_AGG(email, ', ' ORDER BY email) as emails
FROM users 
WHERE is_active = true
GROUP BY role 
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'moderator' THEN 2  
        WHEN 'mentor' THEN 3
        WHEN 'influencer' THEN 4
        WHEN 'guide' THEN 5
        WHEN 'enthusiast' THEN 6
        WHEN 'learner' THEN 7
    END;
```

### Get All Active Users
```sql
SELECT id, email, role, first_name, last_name, last_login, created_at 
FROM users 
WHERE is_active = true 
ORDER BY role, email;
```

### Find Users by Role
```sql
-- Get all admins
SELECT * FROM users WHERE role = 'admin' AND is_active = true;

-- Get all moderators
SELECT * FROM users WHERE role = 'moderator' AND is_active = true;

-- Get all learners
SELECT * FROM users WHERE role = 'learner' AND is_active = true;
```

### User Statistics
```sql
SELECT 
    'Total Active' as category, 
    COUNT(*) as count 
FROM users WHERE is_active = true
UNION ALL
SELECT 
    'Total Inactive' as category, 
    COUNT(*) as count 
FROM users WHERE is_active = false
UNION ALL
SELECT 
    'Total All' as category, 
    COUNT(*) as count 
FROM users;
```

### Recently Active Users
```sql
SELECT email, role, last_login, 
       EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_login))/3600 as hours_since_login
FROM users 
WHERE is_active = true AND last_login IS NOT NULL
ORDER BY last_login DESC
LIMIT 10;
```

### Add New Test User
```sql
INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active, last_login) 
VALUES 
('custom-firebase-uid', 'newuser@example.com', 'learner', 'New', 'User', true, CURRENT_TIMESTAMP);
```

### Update User Role
```sql
UPDATE users 
SET role = 'mentor', updated_at = CURRENT_TIMESTAMP 
WHERE email = 'someuser@example.com';
```

### Deactivate User
```sql
UPDATE users 
SET is_active = false, updated_at = CURRENT_TIMESTAMP 
WHERE email = 'someuser@example.com';
```

### Clear All Users (Use with caution!)
```sql
DELETE FROM users;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
```

## 🚀 Available NPM Commands

```bash
# Reset database and add sample users
npm run setup-all

# Just reset database structure
npm run reset-db

# Just add sample users (clears existing)
npm run insert-sample-users

# Test the API
npm run test-api

# Start development server
npm run dev
```

## 📝 Notes

- Default role for new users is `learner`
- All test users have predictable passwords matching their role names
- Firebase UIDs follow pattern: `{role}-firebase-uid-{number}`
- Sample data includes users with different last login times for testing
- Two inactive users included for testing user management features
