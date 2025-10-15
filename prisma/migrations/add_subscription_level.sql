-- Migration: Add subscription_level field to users table
-- This field will help in future implementation to limit functionalities based on subscription tier
-- Level 1 = StarSeeker (Free)
-- Level 2 = Galaxy Explorer
-- Level 3 = Cosmic Voyager

-- Add subscription_level column to users table
ALTER TABLE "users" ADD COLUMN "subscription_level" INTEGER DEFAULT 1;

-- Update existing users to set their subscription level based on current plan
UPDATE "users" 
SET "subscription_level" = CASE 
    WHEN "subscription_plan" = 'starseeker' THEN 1
    WHEN "subscription_plan" = 'galaxy_explorer' THEN 2
    WHEN "subscription_plan" = 'cosmic_voyager' THEN 3
    ELSE 1
END;

-- Add comment to the column for documentation
COMMENT ON COLUMN "users"."subscription_level" IS 'Subscription tier level: 1=StarSeeker(Free), 2=Galaxy Explorer, 3=Cosmic Voyager. Used for feature access control.';
