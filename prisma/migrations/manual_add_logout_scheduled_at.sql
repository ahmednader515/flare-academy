-- Migration: Add logoutScheduledAt field to User table
-- This field tracks when a user manually logged out, for delayed cleanup (1 minute)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "logoutScheduledAt" TIMESTAMP(3);

