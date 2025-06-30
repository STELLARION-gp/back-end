-- Clear existing users and add sample users for all 7 roles
-- Run this script to reset the users table with proper test data

-- Clear existing users table
DELETE FROM users;

-- Reset the auto-increment sequence
ALTER SEQUENCE users_id_seq RESTART WITH 1;

-- Insert sample users for all 7 roles
INSERT INTO users (firebase_uid, email, role, first_name, last_name, is_active, last_login) VALUES

-- 1. Admin Role - System Administrator
('admin-firebase-uid-001', 'admin@gmail.com', 'admin', 'System', 'Administrator', true, CURRENT_TIMESTAMP),
('admin-firebase-uid-002', 'admin2@example.com', 'admin', 'Super', 'Admin', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- 2. Moderator Role - Community Management  
('moderator-firebase-uid-001', 'moderator@gmail.com', 'moderator', 'Community', 'Moderator', true, CURRENT_TIMESTAMP),
('moderator-firebase-uid-002', 'mod1@example.com', 'moderator', 'Content', 'Moderator', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('moderator-firebase-uid-003', 'mod2@example.com', 'moderator', 'Forum', 'Moderator', true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- 3. Mentor Role - Teaching and Guidance
('mentor-firebase-uid-001', 'mentor@gmail.com', 'mentor', 'Senior', 'Mentor', true, CURRENT_TIMESTAMP),
('mentor-firebase-uid-002', 'mentor1@example.com', 'mentor', 'Lead', 'Instructor', true, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('mentor-firebase-uid-003', 'mentor2@example.com', 'mentor', 'Expert', 'Teacher', true, CURRENT_TIMESTAMP - INTERVAL '1 day'),

-- 4. Influencer Role - Content Creation
('influencer-firebase-uid-001', 'influencer@gmail.com', 'influencer', 'Top', 'Influencer', true, CURRENT_TIMESTAMP),
('influencer-firebase-uid-002', 'creator1@example.com', 'influencer', 'Content', 'Creator', true, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('influencer-firebase-uid-003', 'blogger@example.com', 'influencer', 'Tech', 'Blogger', true, CURRENT_TIMESTAMP - INTERVAL '6 hours'),

-- 5. Guide Role - User Assistance
('guide-firebase-uid-001', 'guide@gmail.com', 'guide', 'Help', 'Guide', true, CURRENT_TIMESTAMP),
('guide-firebase-uid-002', 'support1@example.com', 'guide', 'User', 'Support', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('guide-firebase-uid-003', 'assistant@example.com', 'guide', 'Community', 'Assistant', true, CURRENT_TIMESTAMP - INTERVAL '8 hours'),

-- 6. Enthusiast Role - Active Participation
('enthusiast-firebase-uid-001', 'enthusiast@gmail.com', 'enthusiast', 'Active', 'Enthusiast', true, CURRENT_TIMESTAMP),
('enthusiast-firebase-uid-002', 'fan1@example.com', 'enthusiast', 'Tech', 'Fan', true, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('enthusiast-firebase-uid-003', 'community@example.com', 'enthusiast', 'Community', 'Member', true, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('enthusiast-firebase-uid-004', 'active@example.com', 'enthusiast', 'Super', 'User', true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),

-- 7. Learner Role - Basic Users (Default)
('learner-firebase-uid-001', 'learner@gmail.com', 'learner', 'New', 'Learner', true, CURRENT_TIMESTAMP),
('learner-firebase-uid-002', 'student1@example.com', 'learner', 'John', 'Student', true, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('learner-firebase-uid-003', 'student2@example.com', 'learner', 'Jane', 'Beginner', true, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('learner-firebase-uid-004', 'newbie@example.com', 'learner', 'Alex', 'Newbie', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('learner-firebase-uid-005', 'rookie@example.com', 'learner', 'Sam', 'Rookie', true, CURRENT_TIMESTAMP - INTERVAL '4 hours'),

-- Test inactive users
('inactive-user-001', 'inactive@example.com', 'learner', 'Inactive', 'User', false, CURRENT_TIMESTAMP - INTERVAL '30 days'),
('suspended-user-001', 'suspended@example.com', 'enthusiast', 'Suspended', 'Member', false, CURRENT_TIMESTAMP - INTERVAL '7 days');

-- Verify the insertion
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

-- Show all users summary
SELECT 
    'TOTAL ACTIVE USERS' as summary,
    COUNT(*) as count
FROM users 
WHERE is_active = true

UNION ALL

SELECT 
    'TOTAL INACTIVE USERS' as summary,
    COUNT(*) as count
FROM users 
WHERE is_active = false

UNION ALL

SELECT 
    'TOTAL ALL USERS' as summary,
    COUNT(*) as count
FROM users;
