-- Migration: Add allow_any_domain flag to sites table
-- This flag explicitly allows bypassing domain validation (for dev/testing only)

ALTER TABLE sites 
ADD COLUMN IF NOT EXISTS allow_any_domain BOOLEAN DEFAULT false;

COMMENT ON COLUMN sites.allow_any_domain IS 
  'Explicit opt-in to skip domain validation. Use only for dev/testing. INSECURE if enabled.';

-- Create index for performance (filtering active sites with domain restrictions)
CREATE INDEX IF NOT EXISTS idx_sites_active_domain_check 
  ON sites(active, allow_any_domain) 
  WHERE active = true;
