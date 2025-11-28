-- SQL script to fix PostgreSQL migration state
-- Run this directly in your PostgreSQL database to clear failed migrations

-- Drop the _prisma_migrations table to start fresh
DROP TABLE IF EXISTS _prisma_migrations CASCADE;

-- This will allow Prisma to create a fresh baseline migration

