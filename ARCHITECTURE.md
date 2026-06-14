# PFM Surveys - Architecture & Configuration

## 🎯 Design Philosophy: Zero-Change Deployment

The admin application uses **relative URLs** for API calls, allowing the **exact same code** to work in both development and production without any changes.

---

## 🏗️ How It Works

### Development Mode

```
Browser (localhost:5173)
  ↓ GET /api/sites
  ↓ (Vite Dev Server Proxy)
  ↓
API (localhost:3000)
  ↓ Response
Browser ✅
```

**Configuration:**
- Vite dev server runs on `localhost:5173`
- Vite proxy forwards `/api/*` requests to `localhost:3000`
- Admin code uses relative URLs: `axios.get('/api/sites')`
- Fast, no CORS issues, no ngrok overhead

### Production Mode

```
Browser (pfm-surveys.cloud)
  ↓ GET /api/sites
  ↓
Caddy Reverse Proxy
  ↓ Routes /api/* → api:3000
  ↓ Routes /* → admin:80
  ↓
API Container (port 3000)
  ↓ Response
  ↓
Caddy
  ↓
Browser ✅
```

**Configuration:**
- Everything served from `pfm-surveys.cloud`
- Caddy routes `/api/*` to API container
- Caddy routes `/*` to Admin container
- Same relative URLs work automatically
- **Zero code changes needed**

---

## 📁 File Structure & Configuration

### 1. Vite Configuration (`apps/admin/vite.config.ts`)

```typescript
server: {
    port: 5173,
    host: true,
    proxy: {
        '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
        },
        '/embed': {
            target: 'http://localhost:3000',
            changeOrigin: true,
        },
    },
}
```

**Purpose:** In dev mode, proxy `/api/*` requests to the backend.

### 2. API Service (`apps/admin/src/services/api.ts`)

```typescript
const API_BASE_URL = "";  // Empty = relative URLs

const api = axios.create({
    baseURL: API_BASE_URL,  // Uses relative URLs
});
```

**Purpose:** All API calls use relative URLs (e.g., `/api/sites`), which work in both dev and prod.

### 3. Caddy Configuration (`Caddyfile`)

```caddyfile
{$DOMAIN:pfm-surveys.cloud} {
    handle /api/* {
        reverse_proxy api:3000
    }

    handle /embed/* {
        reverse_proxy api:3000
    }

    handle /* {
        reverse_proxy admin:80
    }
}
```

**Purpose:** In production, route all traffic through same domain.

### 4. Environment Variables

#### Development (`.env` or `apps/admin/.env.local`)

```bash
# API calls use relative URLs + Vite proxy - no config needed
# VITE_API_BASE_URL is NOT used

# Embed script URL for external websites
VITE_EMBED_API_URL=https://nonappropriable-masked-tarah.ngrok-free.dev

# Dev server port
VITE_PORT=5173
```

#### Production (`.env.production`)

```bash
# API calls use relative URLs via Caddy - no config needed
# VITE_API_BASE_URL is NOT used

# Embed script URL for external websites
VITE_EMBED_API_URL=https://pfm-surveys.cloud

# Other production settings...
```

---

## 🚀 Deployment Workflow

### Development

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Start all dev servers
pnpm dev

# Access:
# - Admin: http://localhost:5173
# - API: http://localhost:3000
# - Embed: https://your-ngrok-url.ngrok-free.dev
```

**What Happens:**
- Admin on localhost:5173 with Vite dev server
- Vite proxy forwards `/api/*` to localhost:3000
- Embed script uses ngrok URL for external testing
- **Zero environment-specific code**

### Production Build

```bash
# On VPS
cd /var/www/pfm-surveys.cloud

# Pull latest code
git pull

# Build and deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml build admin
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d admin
```

**What Happens:**
1. `VITE_EMBED_API_URL=https://pfm-surveys.cloud` is baked into build
2. Admin container builds static files
3. Nginx serves static files
4. Caddy routes all `/api/*` to API container
5. **Same relative URLs work automatically**

---

## 🎯 Key Benefits

### ✅ Zero Configuration Changes

| Environment | Admin Code | API Calls | Changes Needed |
|-------------|------------|-----------|----------------|
| **Development** | Same | `/api/*` → proxy → localhost:3000 | **None** |
| **Production** | Same | `/api/*` → Caddy → api:3000 | **None** |

### ✅ Faster Development

- **No ngrok overhead** for admin API calls
- Direct localhost connection
- Instant responses
- No browser warning pages

### ✅ Simplified Deployment

- **Same code in all environments**
- No environment variable juggling
- No rebuild needed for different URLs
- Production builds are environment-agnostic

### ✅ Security

- **No hardcoded URLs** in code
- CORS handled by same-origin policy
- Production uses HTTPS automatically
- No exposed internal endpoints

---

## 🔄 Request Flow Examples

### Example 1: Admin Loads Dashboard

**Development:**
```
1. Browser → GET http://localhost:5173/
2. Vite → Serve index.html + app.js
3. Browser → GET /api/sites (relative URL)
4. Vite Proxy → http://localhost:3000/api/sites
5. API → Response
6. Browser ✅
```

**Production:**
```
1. Browser → GET https://pfm-surveys.cloud/
2. Caddy → Nginx (admin:80)
3. Nginx → Serve index.html + app.js
4. Browser → GET /api/sites (relative URL)
5. Caddy → api:3000
6. API → Response
7. Caddy → Browser ✅
```

**Same code, different routing!**

### Example 2: External Website Loads Embed

**Development:**
```
1. Customer Website → <script src="https://ngrok-url.dev/embed/script.js">
2. Browser → GET https://ngrok-url.dev/embed/script.js
3. ngrok → localhost:3000
4. API → Serve embed.js
5. Browser ✅
```

**Production:**
```
1. Customer Website → <script src="https://pfm-surveys.cloud/embed/script.js">
2. Browser → GET https://pfm-surveys.cloud/embed/script.js
3. Caddy → api:3000
4. API → Serve embed.js
5. Browser ✅
```

---

## 📝 Environment Variable Reference

| Variable | Dev Value | Prod Value | Purpose |
|----------|-----------|------------|---------|
| `VITE_API_BASE_URL` | ❌ NOT USED | ❌ NOT USED | Relative URLs instead |
| `VITE_EMBED_API_URL` | `https://ngrok-url` | `https://pfm-surveys.cloud` | Embed script URL |
| `VITE_PORT` | `5173` | N/A | Dev server port |
| `API_PORT` | `3000` | `3000` | API server port |
| `DATABASE_HOST` | `localhost` | `postgres` | DB connection |
| `REDIS_HOST` | `localhost` | `redis` | Redis connection |

---

## 🐛 Troubleshooting

### Issue: API calls fail in development

**Check:**
1. Is API running on localhost:3000?
   ```bash
   curl http://localhost:3000/health
   ```
2. Is Vite proxy configured? Check `apps/admin/vite.config.ts`
3. Open browser DevTools → Network tab → check request URL

### Issue: Embed script shows localhost in production

**Check:**
1. Is `VITE_EMBED_API_URL` set correctly in production `.env`?
2. Rebuild admin container:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build admin
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d admin
   ```

### Issue: CORS errors in production

**Check:**
1. Are you using relative URLs in the code?
2. Is Caddy routing `/api/*` correctly?
3. Check Caddy logs:
   ```bash
   docker logs pfm-surveys-prod-caddy-1
   ```

---

## 🎓 Best Practices

### ✅ DO

- ✅ Use relative URLs for all API calls
- ✅ Use `VITE_EMBED_API_URL` for embed script generation
- ✅ Test both dev and prod configurations
- ✅ Keep Vite proxy config in sync with production routing

### ❌ DON'T

- ❌ Hardcode `http://localhost:3000` in components
- ❌ Use absolute URLs in API calls
- ❌ Change `API_BASE_URL` in `api.ts`
- ❌ Use `VITE_API_BASE_URL` for admin API calls

---

## 📚 Related Documentation

- **[DEPLOY.md](./DEPLOY.md)** - Production deployment guide
- **[README.md](./README.md)** - Project overview
- **[STATUS.md](./STATUS.md)** - Current system status
- **[Caddyfile](./Caddyfile)** - Production reverse proxy config

---

_Last updated: February 9, 2026_
