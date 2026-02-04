# Getting Started - Survey Platform

This guide will help you set up the survey platform for local development.

> **⚡ Need quick commands?** Check out the [Quick Start Cheat Sheet](./QUICK_START.md) for common commands and troubleshooting.

## Development Philosophy

**Hybrid approach for optimal developer experience:**

- **Infrastructure (Docker):** PostgreSQL and Redis run in Docker containers
- **Application Code (Local):** API, Worker, and Admin dashboard run as local Node.js/Vite processes
- **Production (Full Docker):** All services containerized for consistent deployment

**Why?**
- ✅ Fast hot module replacement (HMR) for Vue app
- ✅ Instant backend restarts with nodemon/tsx
- ✅ No container rebuild delays during development
- ✅ Easy debugging with direct log access
- ✅ Production parity with Docker in production

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ (LTS recommended)
- **npm** or **pnpm** (pnpm recommended for monorepo performance)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
- **Git** (for version control)

## Project Structure

```
pfm-surveys/
├── apps/
│   ├── api/          # Fastify backend API
│   ├── worker/       # BullMQ background workers
│   ├── admin/        # Vue 3 admin dashboard
│   └── embed/        # Vanilla JS embed widget
├── packages/
│   └── shared/       # Shared TypeScript types and utilities
├── docs/             # Architecture and decision docs
├── docker-compose.yml
├── .env.example
└── package.json      # Workspace root
```

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository (or create it)
cd pfm-surveys

# Install dependencies (using pnpm)
pnpm install

# Or using npm
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your local settings:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=surveys_dev
DATABASE_USER=surveys_user
DATABASE_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# API
API_PORT=3000
API_HOST=0.0.0.0
NODE_ENV=development

# JWT Authentication
JWT_ACCESS_SECRET=your_jwt_access_secret_change_this
JWT_REFRESH_SECRET=your_jwt_refresh_secret_change_this
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# HMAC Security (for embed script signing)
HMAC_SECRET=your_hmac_secret_for_embed_signing

# Worker
WORKER_CONCURRENCY=5
ROLLUP_INTERVAL_MS=60000

# Admin Dashboard
VITE_API_BASE_URL=http://localhost:3000

# Embed Script
VITE_EMBED_API_URL=http://localhost:3000
```

### 3. Start Infrastructure Services

Start **only** PostgreSQL and Redis using Docker Compose (API, Worker, and Admin will run locally):

```bash
# Start infrastructure containers
docker-compose up -d postgres redis

# Or simply (only postgres and redis are defined for dev)
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps

# Should show:
# surveys-postgres  (running)
# surveys-redis     (running)
```

### 4. Run Database Migrations

```bash
# From the workspace root
pnpm --filter api migrate:latest

# Or if you haven't set up migrations yet, you'll create them soon
```

### 5. Start Development Servers

**Important:** During development, all services run locally (not in Docker) for hot module replacement and faster iteration. Only PostgreSQL and Redis run in Docker containers. In production, everything will be containerized.

You can run all services individually or together:

#### Option A: Run Everything (Recommended for Development)

```bash
# Start all services in parallel
pnpm dev
```

This will start:
- API on `http://localhost:3000` (Node.js process, local)
- Worker (background process, local)
- Admin dashboard on `http://localhost:5173` (Vite dev server, local)
- Embed build in watch mode (local)

#### Option B: Run Services Individually

In separate terminal windows:

```bash
# Terminal 1: API (local Node.js)
pnpm --filter api dev

# Terminal 2: Worker (local Node.js)
pnpm --filter worker dev

# Terminal 3: Admin Dashboard (local Vite dev server with HMR)
pnpm --filter admin dev

# Terminal 4: Embed (watch mode)
pnpm --filter embed dev
```

**Why this approach?**
- Vite dev server provides instant hot module replacement (HMR)
- Backend services support live reload with nodemon/tsx
- Faster iteration without container rebuilds
- Direct access to logs and debugging tools

## Quick Reference: What Runs Where?

### Development Environment

| Service | Runs In | Command | Port | URL |
|---------|---------|---------|------|-----|
| PostgreSQL | 🐳 Docker | `docker-compose up -d` | 5432 | - |
| Redis | 🐳 Docker | `docker-compose up -d` | 6379 | - |
| API | 💻 Local | `pnpm --filter api dev` | 3000 | http://localhost:3000 |
| Worker | 💻 Local | `pnpm --filter worker dev` | - | - |
| Admin | 💻 Local | `pnpm --filter admin dev` | 5173 | http://localhost:5173 |
| Embed | 💻 Local | `pnpm --filter embed dev` | - | (builds to dist/) |

### Production Environment

| Service | Runs In | Command | Notes |
|---------|---------|---------|-------|
| PostgreSQL | 🐳 Docker | `docker-compose -f docker-compose.prod.yml up` | Data persistence |
| Redis | 🐳 Docker | `docker-compose -f docker-compose.prod.yml up` | Queue & cache |
| API | 🐳 Docker | Built from Dockerfile | Serves REST API |
| Worker | 🐳 Docker | Built from Dockerfile | Background jobs |
| Admin | 🐳 Docker | Served by Caddy/nginx | Static files |
| Embed | 🐳 Docker | Served by API | Via /embed.js |
| Caddy | 🐳 Docker | Reverse proxy | HTTPS + routing |

## Development Workflow

### Testing the API

```bash
# Create a test tenant and site
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tenant"}'

# Check API health
curl http://localhost:3000/health
```

### Testing the Embed Script

1. The embed is a build artifact: run `pnpm build:embed` (or `pnpm dev:api` from repo root to build embed then start API). The API serves **only** the built script from `apps/embed/dist/embed.js`; if it’s missing, `GET /embed/script.js` returns 503 with instructions.
2. Create a simple HTML test page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Embed Test</title>
</head>
<body>
  <h1>Survey Embed Test</h1>

  <script>
    (function() {
      var script = document.createElement('script');
      script.src = 'http://localhost:3000/embed/script.js?site_id=YOUR_SITE_ID';
      script.async = true;
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>
```

### Accessing Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000 | Backend API |
| Admin Dashboard | http://localhost:5173 | Vue 3 frontend |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Queue and cache |

## Common Commands

```bash
# Install dependencies
pnpm install

# Run all services
pnpm dev

# Build all apps for production
pnpm build

# Run linter
pnpm lint

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Clean all build artifacts
pnpm clean

# Database operations (in api package)
pnpm --filter api migrate:latest
pnpm --filter api migrate:rollback
pnpm --filter api seed

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Working with the Monorepo

This project uses a monorepo structure with workspace dependencies:

### Adding a New Package Dependency

```bash
# Add to a specific app
pnpm --filter api add fastify
pnpm --filter admin add vue

# Add to shared package
pnpm --filter shared add zod

# Add dev dependency to workspace root
pnpm add -D -w typescript
```

### Referencing Shared Package

In `apps/api/package.json`:

```json
{
  "dependencies": {
    "shared": "workspace:*"
  }
}
```

Then import in code:

```typescript
import { SurveyConfig } from 'shared';
```

## Database Management

### Creating Migrations

```bash
cd apps/api
pnpm migrate:create add_surveys_table
```

### Running Migrations

```bash
# Latest
pnpm --filter api migrate:latest

# Rollback
pnpm --filter api migrate:rollback

# Reset (rollback all + migrate latest)
pnpm --filter api migrate:reset
```

### Database Seeding (Optional)

```bash
pnpm --filter api seed
```

## Queue Monitoring

### BullMQ Dashboard (Optional)

You can add Bull Board for visual queue monitoring:

```bash
# Install in API package
pnpm --filter api add @bull-board/api @bull-board/fastify
```

Access at: `http://localhost:3000/admin/queues`

## Troubleshooting

### PostgreSQL Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Port Already in Use

```bash
# Find process using port 3000 (Windows)
netstat -ano | findstr :3000

# Find process (Linux/Mac)
lsof -i :3000

# Kill the process or change the port in .env
```

### Hot Module Reload Not Working

```bash
# Clear Vite cache
rm -rf apps/admin/node_modules/.vite
rm -rf apps/embed/node_modules/.vite

# Restart dev server
pnpm --filter admin dev
```

### Worker Not Processing Jobs

```bash
# Check Redis connection
docker-compose exec redis redis-cli

# Check queue length
LLEN bull:event-ingestion:wait

# View worker logs
pnpm --filter worker dev
```

## Production Build

### Build All Apps

```bash
pnpm build
```

This creates production-ready builds:
- `apps/api/dist/` - Compiled TypeScript
- `apps/worker/dist/` - Compiled TypeScript
- `apps/admin/dist/` - Static assets (optimized Vue app bundle)
- `apps/embed/dist/` - Minified embed script

### Docker Compose Production

Unlike development where services run locally, **production deploys everything in Docker containers**:

```bash
# Build production images (includes Vue app build)
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# With Caddy reverse proxy for HTTPS
docker-compose -f docker-compose.prod.yml --profile production up -d
```

**Production containers:**
- `api` - Serves the REST API
- `worker` - Processes background jobs
- `admin` - Static files served by Caddy or nginx
- `postgres` - Database
- `redis` - Queue and cache
- `caddy` - Reverse proxy with automatic HTTPS

**Dev vs Production:**
- **Dev:** API, Worker, Admin run as local Node/Vite processes (fast HMR)
- **Prod:** All services containerized (consistent deployment)

## Environment-Specific Configs

### Development (.env)
- Hot reload enabled
- Detailed logging
- CORS enabled for localhost
- No rate limiting

### Production (.env.production)
- Optimized builds
- Error logging only
- Strict CORS
- Rate limiting enabled
- HTTPS enforced

## Next Steps

1. **Create Initial Database Schema** - Define tables for tenants, sites, surveys, events, answers, and rollups
2. **Implement API Endpoints** - Start with authentication, tenant/site management
3. **Build Worker Jobs** - Event ingestion and rollup processing
4. **Design Admin UI** - Survey creation and dashboard views (see [Admin Screens Documentation](../docs/admin-screens.md))
5. **Develop Embed Script** - Configuration fetching and event tracking

## Admin Dashboard Development

When building the Vue 3 admin dashboard, refer to the complete UI specifications:

📋 **[Admin Dashboard Screens Documentation](./admin-screens.md)**

This includes detailed requirements for:
- Login and authentication screens
- Site management (list, add, edit)
- Survey list with active/inactive tabs
- Survey builder with live preview
- Results screen with charts and response table
- All components, layouts, and user flows

## Useful Resources

- [Fastify Documentation](https://fastify.dev/)
- [Kysely Query Builder](https://kysely.dev/)
- [BullMQ Guide](https://docs.bullmq.io/)
- [Vue 3 Documentation](https://vuejs.org/)
- [PrimeVue Components](https://primevue.org/)
- [Vite Documentation](https://vitejs.dev/)

## Getting Help

- Check `docs/architecture.md` for system design details
- Check `docs/decisions.md` for architectural decision records
- Review API documentation at `http://localhost:3000/documentation` (when implemented)

---

**Ready to build?** Start with `pnpm install && docker-compose up -d && pnpm dev` 🚀
