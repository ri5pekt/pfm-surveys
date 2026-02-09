# Security Hardening Implementation Summary

## Overview

This document summarizes the practical security measures implemented to protect the survey platform before production deployment. The implementation follows a **defense-in-depth** strategy focusing on realistic anti-abuse measures rather than security theater.

---

## ✅ Completed Security Measures

### 1. Domain Validation (Primary Defense)

**Purpose**: Prevent unauthorized domains from sending fake survey events.

**Implementation**:
- **Location**: `apps/api/src/routes/embed.ts`
- **Function**: `isOriginAllowed(origin, referer, allowedDomains, allowAnyDomain)`
- **Database**: Added `allow_any_domain` boolean flag to `sites` table

**How it works**:
1. Validates request `Origin` or `Referer` header against site's allowed domains
2. Supports wildcard patterns (e.g., `*.example.com` matches all subdomains)
3. Fallback to `Referer` if `Origin` is missing (privacy-conscious browsers)
4. Empty domains = DENY by default (secure by default)
5. Explicit `allow_any_domain` flag required to bypass (dev/testing only)

**HTTP Response**:
- ✅ **200 OK**: Domain is allowed
- ❌ **403 Forbidden**: Domain not authorized

**Admin UI**:
- Updated `AddSiteView.vue` and `WebsitesView.vue`
- Domain input field with wildcard support
- Checkbox for "Allow any domain" with warning
- Visual indicators for security status

---

### 2. Rate Limiting (Dual-Bucket Strategy)

**Purpose**: Prevent spam, abuse, and DDoS attacks through layered rate limiting.

**Implementation**:

#### Global Rate Limit
- **Location**: `apps/api/src/index.ts`
- **Package**: `@fastify/rate-limit` with Redis backend
- **Default**: 1000 requests per 15 minutes (configurable via `RATE_LIMIT_GLOBAL_MAX`)
- **Scope**: All requests to the API
- **Behavior**: Graceful degradation if Redis is down (`skipOnError: true`)

#### Per-IP Rate Limit
- **Location**: `apps/api/src/routes/embed.ts` (POST `/api/public/events`)
- **Default**: 60 requests per minute per IP
- **Key**: Extracted from `X-Forwarded-For` or `request.ip`
- **Scope**: Public event ingestion endpoint

#### Per-Site Rate Limit
- **Location**: `apps/api/src/routes/embed.ts` (POST `/api/public/events`)
- **Default**: 200 requests per minute per site
- **Key**: `rl:site:{site_id}:{current_minute}`
- **Important**: Limits REQUESTS, not total events (each request can contain up to 50 events)
- **Headers**: Returns `X-RateLimit-Limit` and `X-RateLimit-Remaining`

**HTTP Response**:
- ✅ **202 Accepted**: Under rate limit
- ❌ **429 Too Many Requests**: Rate limit exceeded

**Configuration** (`.env`):
```env
RATE_LIMIT_GLOBAL_MAX=1000
RATE_LIMIT_IP_MAX=60
RATE_LIMIT_SITE_MAX=200
```

---

### 3. Request Body Limits & Strict Schemas

**Purpose**: Prevent large payloads from exhausting server resources and enforce data validation.

**Implementation**:

#### Body Limits
- **Global**: 1MB (`apps/api/src/index.ts`)
- **Per-endpoint**: 100KB for `/api/public/events` (`bodyLimit: 102400`)

#### Zod Validation
- **Location**: `apps/api/src/routes/embed.ts`
- **Schema**: `EventsRequestSchema`
  - `site_id`: max 100 chars
  - `nonce`: max 100 chars (optional)
  - `events`: array of 1-50 events
  - Each event validated with `EventSchema`:
    - `event_type`: max 50 chars
    - `client_event_id`: max 100 chars
    - `page_url`: max 2048 chars
    - `survey_id`: UUID format
    - etc.

**HTTP Response**:
- ✅ **202 Accepted**: Valid schema
- ❌ **400 Bad Request**: Invalid request with Zod error details
- ❌ **413 Payload Too Large**: Body exceeds size limit

---

### 4. Input Cleanup & Safe Output

**Purpose**: Remove garbage from user input and prevent XSS at display time.

**Important Philosophy**:
> We do NOT attempt XSS prevention by regex-stripping on input. That's brittle and gives false confidence. Instead:
> 1. **Store raw** (with length limits)
> 2. **Escape on output** (Vue's `{{ }}` text interpolation auto-escapes HTML)
> 3. **Clean up obvious garbage** (control chars, null bytes)

**Implementation**:

#### Input Cleanup Functions
- **Location**: `apps/api/src/routes/embed.ts`
- **Functions**:
  - `cleanText(input, maxLength)`: Removes control characters, enforces length
  - `cleanUrl(input)`: URL-specific cleanup (doesn't mangle legitimate URLs)

**Applied to**:
- `anonymous_user_id` (100 chars)
- `session_id` (100 chars)
- `page_url` (2048 chars, URL-specific)
- `event_data.answer_text` (10,000 chars)
- `browser`, `os`, `device` (50 chars each)

#### Safe Output
- **Admin UI**: Uses Vue's `{{ }}` interpolation (auto-escapes HTML)
- **Never use**: `v-html` without explicit sanitization

#### Database Constraints
- **Migration**: `002_add_length_constraints.sql`
- **Applied to**: surveys, questions, answer_options, answers, sites, users, tenants
- **Enforces**: Max character lengths at database level (defense-in-depth)

---

### 5. HTTPS Setup with Caddy

**Purpose**: Baseline security - encrypt all traffic and add security headers.

**Implementation**:

#### Production Docker Compose
- **File**: `docker-compose.prod.yml`
- **Services**:
  - `postgres`: PostgreSQL 16 with health checks and backups
  - `redis`: Redis 7 with persistence and memory limits
  - `api`: Fastify API server (proxied by Caddy)
  - `worker`: BullMQ worker for background jobs
  - `admin`: Vue.js admin frontend (served by Caddy)
  - `caddy`: Automatic HTTPS via Let's Encrypt

#### Caddyfile Configuration
- **File**: `Caddyfile`
- **Features**:
  - Automatic HTTPS with Let's Encrypt
  - HTTP → HTTPS redirect
  - Security headers:
    - `Strict-Transport-Security` (HSTS)
    - `X-Content-Type-Options`
    - `X-Frame-Options`
    - `X-XSS-Protection`
    - `Referrer-Policy`
    - `Permissions-Policy`
  - Gzip/Zstd compression
  - Static asset caching (with cache busting for HTML)
  - Access logs (JSON format, 100MB rotation)
  - Error handling

#### Deployment Script
- **File**: `scripts/deploy-prod.sh`
- **Features**:
  - Environment validation (checks for default passwords)
  - Docker image building
  - Database migrations
  - Service health checks
  - Status reporting

**Usage**:
```bash
# Update .env with production values
vim .env

# Run deployment script
bash scripts/deploy-prod.sh
```

---

## Security Layers Summary

```
Incoming Request
      ↓
[1] HTTPS? ──No──→ Reject (Caddy redirect)
      ↓ Yes
[2] Domain Allowed? ──No──→ 403 Forbidden
      ↓ Yes
[3] IP Rate Limit OK? ──No──→ 429 Too Many Requests
      ↓ Yes
[4] Site Rate Limit OK? ──No──→ 429 Site Limit Exceeded
      ↓ Yes
[5] Body Size OK? ──No──→ 413 Payload Too Large
      ↓ Yes
[6] Valid Schema? ──No──→ 400 Invalid Request
      ↓ Yes
[7] Nonce Fresh? ──No──→ 409 Replay Detected
      ↓ Yes
[8] Clean Input ──→ Store Raw
      ↓
[9] Enqueue Events
      ↓
✓ 202 Accepted
```

**Defense in Depth**: Each layer catches different attack vectors. Bypass one, hit the next.

---

## Testing Checklist

### Domain Validation
- [ ] Request from allowed domain → 200
- [ ] Request from unauthorized domain → 403
- [ ] No Origin but valid Referer → 200 (fallback for privacy tools)
- [ ] No Origin AND no Referer → 403
- [ ] Wildcard `*.example.com` matches subdomains
- [ ] Empty domains + `allow_any_domain=false` → 403 (secure default)
- [ ] Empty domains + `allow_any_domain=true` → 200 (explicit dev mode)

### Rate Limiting
- [ ] Under limit → 200
- [ ] Over per-IP limit (60 req/min) → 429
- [ ] Over per-site limit (200 req/min) → 429
- [ ] Rate limit headers present and accurate
- [ ] Redis down → graceful degradation (skipOnError)
- [ ] Verify counting requests, not total events in batch

### Body Limits & Validation
- [ ] >100KB payload → 413
- [ ] >50 events → 400
- [ ] Invalid Zod schema → 400 with details
- [ ] Oversized strings truncated

### Input Cleanup & Safe Output
- [ ] Control characters removed from text
- [ ] Null bytes filtered
- [ ] Long inputs truncated to limits
- [ ] URLs NOT mangled by text sanitization
- [ ] Admin displays via `{{ }}` (Vue auto-escapes)
- [ ] No v-html without explicit sanitization
- [ ] Storage accepts "raw" input (not attempting XSS prevention)

### HTTPS/Deployment
- [ ] Caddy obtains Let's Encrypt cert
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present
- [ ] Health checks pass
- [ ] Services restart on failure

---

## Database Migrations Applied

### Migration 001: Add `allow_any_domain` Flag
**File**: `apps/api/src/db/migrations/001_add_allow_any_domain_flag.sql`

```sql
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS allow_any_domain BOOLEAN DEFAULT false;

COMMENT ON COLUMN sites.allow_any_domain IS
  'Explicit opt-in to skip domain validation. Use only for dev/testing. INSECURE if enabled.';

CREATE INDEX IF NOT EXISTS idx_sites_active_domain_check
  ON sites(active, allow_any_domain)
  WHERE active = true;
```

### Migration 002: Add Length Constraints
**File**: `apps/api/src/db/migrations/002_add_length_constraints.sql`

Adds `CHECK` constraints for:
- Survey names, descriptions, thank you messages
- Question text, image URLs
- Answer option text
- Answer text (responses)
- Site names
- User names and emails
- Tenant names

---

## Configuration Reference

### Environment Variables (`.env`)

```env
# Rate Limiting
RATE_LIMIT_GLOBAL_MAX=1000    # Global requests per 15 min
RATE_LIMIT_IP_MAX=60          # Per-IP requests per minute
RATE_LIMIT_SITE_MAX=200       # Per-site requests per minute

# Production Domain
DOMAIN=surveys.example.com    # Your production domain

# Database (use strong passwords)
DATABASE_PASSWORD=your_secure_password_here

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here
```

---

## Key Implementation Details

### 1. Domain Validation Default Behavior

**Secure default**: Empty `domains` array = DENY unless `allow_any_domain` flag is explicitly true.

```typescript
// ❌ BAD (insecure)
if (!allowedDomains || allowedDomains.length === 0) {
  return true;  // Allows everything!
}

// ✅ GOOD (secure)
if (!allowedDomains || allowedDomains.length === 0) {
  return allowAnyDomain;  // Deny unless explicitly opted-in
}
```

### 2. Origin/Referer Fallback

**Practical**: Allow missing `Origin` if `Referer` is present and valid. Some privacy tools/browsers block `Origin` header.

```typescript
// Try Origin first
if (origin) {
  try { hostname = new URL(origin).hostname; } catch {}
}
// Fallback to Referer (for privacy-conscious browsers)
else if (referer) {
  try { hostname = new URL(referer).hostname; } catch {}
}
// Both missing = reject
if (!hostname) return false;
```

### 3. Sanitization Philosophy

**Don't pretend regex = XSS prevention**. The cleanup functions remove garbage, not security threats.

**Real XSS prevention happens at display time** via Vue's `{{ }}` text interpolation (auto-escapes HTML).

Store raw → Display escaped = robust defense.

### 4. URL Handling

**Don't apply text sanitization to URLs**. Legitimate URLs can contain characters that look suspicious.

```typescript
// ❌ BAD
page_url: cleanText(e.page_url)  // Might break valid URLs

// ✅ GOOD
page_url: cleanUrl(e.page_url)  // Only removes control chars
```

Validate URLs via Zod schema: `z.string().url().max(2048)`

### 5. Rate Limit Granularity

**Be explicit**: Current implementation limits **requests per minute**, not **total events**.

- Each request can contain up to 50 events (batch)
- 200 requests/min = up to 10,000 events/min per site
- If you need event-level limiting, add separate counter

```typescript
// Current: counts requests
const siteRequestCount = await redis.incr(`rl:site:${site.id}:${minute}`);

// Alternative: count total events in batch
const eventCount = await redis.incrby(`rl:events:${site.id}:${minute}`, events.length);
```

---

## What This Implementation Does NOT Do

**Important Clarifications**:

1. **No browser-exposed HMAC signing** - Rejected as security theater. Any secret in the browser is public.
2. **No "XSS prevention by regex"** - Input cleanup removes garbage, not threats. Real XSS prevention = escape on output.
3. **No client-side validation** - All security checks happen server-side.
4. **No authentication for public endpoints** - Public embed endpoints are designed to be called by any website (with domain validation).

---

## Production Deployment

### Prerequisites
1. Linux server with Docker and Docker Compose installed
2. Domain name pointing to your server
3. Firewall configured to allow ports 80 and 443

### Steps

1. **Clone repository** and navigate to project root:
   ```bash
   cd /path/to/pfm-surveys
   ```

2. **Configure environment**:
   ```bash
   cp .env .env.production
   vim .env.production
   ```

   Update these values:
   - `DOMAIN`: Your production domain
   - `DATABASE_PASSWORD`: Strong password
   - `JWT_SECRET`: Generate with `openssl rand -hex 32`
   - `SMTP_*`: SMTP credentials (e.g. Hostinger surveys@pfm-qa.com)

3. **Run deployment script**:
   ```bash
   bash scripts/deploy-prod.sh
   ```

4. **Verify deployment**:
   ```bash
   # Check service status
   docker-compose -f docker-compose.prod.yml ps

   # View logs
   docker-compose -f docker-compose.prod.yml logs -f api

   # Test health endpoint
   curl https://your-domain.com/health
   ```

5. **Create first admin user** (via API or database):
   ```bash
   docker-compose -f docker-compose.prod.yml exec api pnpm seed
   ```

6. **Access admin panel**:
   - Visit `https://your-domain.com`
   - Login with seeded credentials
   - Create your first site

---

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 api
```

### Database Backup
```bash
# Export backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U $DATABASE_USER $DATABASE_NAME > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U $DATABASE_USER $DATABASE_NAME < backup_20260204.sql
```

### Service Management
```bash
# Restart service
docker-compose -f docker-compose.prod.yml restart api

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Update and redeploy
git pull
bash scripts/deploy-prod.sh
```

---

## Summary

✅ **Implemented**:
- Domain validation (primary defense)
- Three-tier rate limiting (global, per-IP, per-site)
- Request body limits and Zod schemas
- Input cleanup with safe output rendering
- Database length constraints
- Production HTTPS setup with Caddy
- Automated deployment script

✅ **Secure by default**:
- Empty domains = blocked (unless explicit opt-in)
- Strong rate limits prevent abuse
- All traffic encrypted (HTTPS)
- Security headers added
- Input validated at every layer

✅ **Production-ready**:
- Docker Compose configuration
- Automated migrations
- Health checks and monitoring
- Access logs with rotation
- Graceful error handling

This is now **"minimum decent security"** - practical, realistic, and maintainable. Not overkill, not theater. Just solid defenses against real-world abuse.
