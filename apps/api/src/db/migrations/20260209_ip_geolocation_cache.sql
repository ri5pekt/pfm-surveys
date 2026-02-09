-- IP Geolocation Cache Table
-- Stores IP geolocation lookups to reduce API calls to ip-api.com
-- This table caches geolocation data for IPs we've already looked up

CREATE TABLE IF NOT EXISTS ip_geolocation_cache (
    ip VARCHAR(45) PRIMARY KEY,           -- IPv4 or IPv6 address
    country VARCHAR(2),                    -- ISO 3166-1 alpha-2 country code (e.g., 'US')
    state VARCHAR(10),                     -- State/region code (e.g., 'CA')
    state_name VARCHAR(255),               -- Full state/region name (e.g., 'California')
    city VARCHAR(255),                     -- City name
    lookup_count INTEGER DEFAULT 1,        -- How many times this IP has been seen
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When we first cached this IP
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,   -- When we last saw this IP
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for finding stale entries (for future cleanup)
CREATE INDEX IF NOT EXISTS idx_ip_geo_cache_last_seen ON ip_geolocation_cache(last_seen_at);

-- Index for finding frequently accessed IPs
CREATE INDEX IF NOT EXISTS idx_ip_geo_cache_lookup_count ON ip_geolocation_cache(lookup_count);

-- Notes:
-- - This table reduces API calls to ip-api.com by caching results
-- - lookup_count and last_seen_at help identify "hot" IPs vs stale ones
-- - In the future, we can clean up entries not seen in X days/months
-- - The cache is updated on every lookup to track usage patterns
