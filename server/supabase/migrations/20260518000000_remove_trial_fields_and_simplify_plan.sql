-- ==========================================================
-- Remove Trial Fields and Simplify Plan
-- Purpose: Remove trial-related functionality and simplify subscription to paid/free only
-- ==========================================================

-- 1. Remove trial-related columns from UserSubscriptions table
ALTER TABLE "UserSubscriptions" DROP COLUMN IF EXISTS trial_start;
ALTER TABLE "UserSubscriptions" DROP COLUMN IF EXISTS trial_end_scheduled;
ALTER TABLE "UserSubscriptions" DROP COLUMN IF EXISTS trial_end;

-- 2. Update plan default from 'trial' to 'free' and update existing values
-- First, change existing 'trial' plans to 'free'
UPDATE "UserSubscriptions" SET plan = 'free' WHERE plan = 'trial';

-- Then alter the column to have 'free' as default
ALTER TABLE "UserSubscriptions" ALTER COLUMN plan SET DEFAULT 'free';

-- 3. Add constraint to ensure plan is only 'free' or 'paid'
ALTER TABLE "UserSubscriptions" ADD CONSTRAINT check_plan_valid 
  CHECK (plan IN ('free', 'paid'));

-- 4. Update existing subscription records to match current is_paid status in Profiles
-- This ensures consistency between Profiles.is_paid and UserSubscriptions.plan
UPDATE "UserSubscriptions"
SET plan = 'paid', status = 'active'
WHERE user_id IN (
  SELECT id FROM "Profiles" WHERE is_paid = true
);

UPDATE "UserSubscriptions"
SET plan = 'free', status = 'inactive'
WHERE user_id IN (
  SELECT id FROM "Profiles" WHERE is_paid = false
);
