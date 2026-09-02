-- API Keys table for external /api/v1/ access
-- Keys are stored as SHA-256 hashes; the raw key is shown to the user once at creation.
-- Raw key format: pfm_sk_live_<64 hex chars>

CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,
    key_hash     TEXT        NOT NULL UNIQUE,   -- SHA-256(raw_key), never stored plain
    key_prefix   TEXT        NOT NULL,           -- e.g. "pfm_sk_live_a1b2c3d4" shown in UI
    scopes       TEXT[]      NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,                    -- NULL = no expiry
    revoked_at   TIMESTAMPTZ,                    -- NULL = active
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_tenant_id_idx ON api_keys (tenant_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys (key_hash);  -- hot path: every /api/v1/ request
