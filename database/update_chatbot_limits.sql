-- Update subscription plans with chatbot question limits
-- starseeker: 3 questions per day
-- galaxy_explorer: unlimited (-1)
-- cosmic_voyager: unlimited (-1)

UPDATE subscription_plans 
SET chatbot_questions_limit = 3 
WHERE plan_type = 'starseeker';

UPDATE subscription_plans 
SET chatbot_questions_limit = -1 
WHERE plan_type = 'galaxy_explorer';

UPDATE subscription_plans 
SET chatbot_questions_limit = -1 
WHERE plan_type = 'cosmic_voyager';

-- Verify the updates
SELECT plan_type, name, chatbot_questions_limit 
FROM subscription_plans 
ORDER BY plan_type;
