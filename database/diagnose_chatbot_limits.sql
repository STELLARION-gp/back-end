-- Diagnostic Query: Check Chatbot Usage Status
-- Run this to see all users' chatbot usage

SELECT 
  id,
  email,
  firebase_uid,
  subscription_plan,
  chatbot_questions_used,
  chatbot_questions_reset_date,
  CASE 
    WHEN chatbot_questions_reset_date::date = CURRENT_DATE THEN 'Today'
    WHEN chatbot_questions_reset_date::date < CURRENT_DATE THEN 'Needs Reset'
    ELSE 'Future Date'
  END as reset_status
FROM users
WHERE email IS NOT NULL
ORDER BY chatbot_questions_used DESC, email;

-- Check subscription plan limits
SELECT 
  plan_type,
  name,
  chatbot_questions_limit
FROM subscription_plans
ORDER BY plan_type;

-- Find users who might be blocked
SELECT 
  u.id,
  u.email,
  u.firebase_uid,
  u.subscription_plan,
  u.chatbot_questions_used,
  sp.chatbot_questions_limit,
  u.chatbot_questions_reset_date,
  CASE 
    WHEN sp.chatbot_questions_limit = -1 THEN 'Unlimited'
    WHEN u.chatbot_questions_used >= sp.chatbot_questions_limit THEN 'BLOCKED'
    ELSE 'OK'
  END as status
FROM users u
LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
WHERE u.email IS NOT NULL
ORDER BY status DESC, u.email;
