-- Migration script to update existing quiz status values
-- This script converts the old 'open' status to 'approved' before schema changes

-- Update all quizzes with 'open' status to 'approved'
UPDATE "Quizzes"
SET status = 'approved'
WHERE status = 'open';

-- Update all quizzes with 'closed' status to 'closed' (no change needed, just ensuring consistency)
-- Note: 'closed' is valid in both old and new enum
