-- Migration: Add Poll Moderation System
-- Date: 2025-01-19
-- Description: Updates polls table to support moderation workflow with pending/approved/rejected statuses

-- Step 1: Create poll_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE poll_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add moderated_at column
ALTER TABLE polls 
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP(6);

-- Step 3: Update status column to use poll_status enum
-- First, update existing data to match enum values
UPDATE polls 
SET status = 'approved' 
WHERE status = 'open' OR status IS NULL OR status NOT IN ('pending', 'approved', 'rejected');

-- Step 4: Change column type to poll_status enum
ALTER TABLE polls 
ALTER COLUMN status TYPE poll_status 
USING status::poll_status;

-- Step 5: Set default value for status
ALTER TABLE polls 
ALTER COLUMN status SET DEFAULT 'pending';

-- Step 6: Update existing NULL statuses to pending (if any remain)
UPDATE polls 
SET status = 'pending' 
WHERE status IS NULL;

-- Step 7: Add NOT NULL constraint
ALTER TABLE polls 
ALTER COLUMN status SET NOT NULL;

-- Verification queries
SELECT 
    COUNT(*) as total_polls,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'approved') as approved,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM polls;

COMMENT ON COLUMN polls.status IS 'Moderation status: pending (awaiting review), approved (visible to public), rejected (not visible)';
COMMENT ON COLUMN polls.moderated_at IS 'Timestamp when the poll was approved or rejected by a moderator';
COMMENT ON COLUMN polls.moderated_by IS 'User ID of the moderator who approved or rejected the poll';
