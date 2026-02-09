-- Migration: Add description column to surveys table
-- Date: 2026-02-01

ALTER TABLE surveys
ADD COLUMN IF NOT EXISTS description TEXT;
