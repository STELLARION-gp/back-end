-- Reset Chatbot Usage for All Users
-- Use this script to reset the daily limit for testing or if there's an issue

-- Option 1: Reset for ALL users
UPDATE users
SET 
  chatbot_questions_used = 0,
  chatbot_questions_reset_date = CURRENT_DATE
WHERE email IS NOT NULL;

-- Option 2: Reset for a specific user by email
-- UPDATE users
-- SET 
--   chatbot_questions_used = 0,
--   chatbot_questions_reset_date = CURRENT_DATE
-- WHERE email = 'user@example.com';

-- Option 3: Reset for a specific user by firebase_uid
-- UPDATE users
-- SET 
--   chatbot_questions_used = 0,
--   chatbot_questions_reset_date = CURRENT_DATE
-- WHERE firebase_uid = 'FIREBASE_UID_HERE';

-- Option 4: Reset only starseeker users
-- UPDATE users
-- SET 
--   chatbot_questions_used = 0,
--   chatbot_questions_reset_date = CURRENT_DATE
-- WHERE subscription_plan = 'starseeker';

-- Verify the reset
SELECT 
  id,
  email,
  subscription_plan,
  chatbot_questions_used,
  chatbot_questions_reset_date
FROM users
WHERE email IS NOT NULL
ORDER BY email;
