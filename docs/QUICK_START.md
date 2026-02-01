# Quick Start Cheat Sheet

## First Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env and set your secrets
# Generate secrets with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 4. Start infrastructure (Docker containers)
docker-compose up -d

# 5. Verify containers are running
docker-compose ps

# 6. Run database migrations
pnpm --filter api migrate:latest

# 7. Start all services (local processes)
pnpm dev
```

## Daily Development

```bash
# Start infrastructure (if not running)
docker-compose up -d

# Start all services
pnpm dev

# Access services:
# - API: http://localhost:3000
# - Admin: http://localhost:5173
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

## What Runs Where?

### In Docker (Infrastructure)
- 🐳 PostgreSQL on port 5432
- 🐳 Redis on port 6379

### Locally (Application)
- 💻 API on http://localhost:3000 (auto-restart)
- 💻 Worker (background jobs)
- 💻 Admin on http://localhost:5173 (hot reload)
- 💻 Embed build (watch mode)

## Common Commands

```bash
# Start infrastructure only
docker-compose up -d

# Stop infrastructure
docker-compose down

# View infrastructure logs
docker-compose logs -f postgres
docker-compose logs -f redis

# Start all app services
pnpm dev

# Start individual services
pnpm --filter api dev      # API only
pnpm --filter worker dev   # Worker only
pnpm --filter admin dev    # Admin only
pnpm --filter embed dev    # Embed only

# Database operations
pnpm --filter api migrate:latest   # Run migrations
pnpm --filter api migrate:rollback # Rollback last migration
pnpm --filter api seed             # Seed database

# Build for production
pnpm build

# Run linters
pnpm lint

# Run tests
pnpm test
```

## Environment Variables Quick Reference

```env
# Database (Docker container, accessed from localhost)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=surveys_dev
DATABASE_USER=surveys_user
DATABASE_PASSWORD=change_this_password

# Redis (Docker container, accessed from localhost)
REDIS_HOST=localhost
REDIS_PORT=6379

# API
API_PORT=3000
NODE_ENV=development

# Secrets (generate new ones!)
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here
HMAC_SECRET=your_secret_here

# Admin Dashboard
VITE_API_BASE_URL=http://localhost:3000
VITE_PORT=5173
```

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Find and kill the process using the PID shown
taskkill /PID <pid> /F

# Or change the port in .env
```

### PostgreSQL connection failed
```bash
# Check if running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

### Redis connection failed
```bash
# Check if running
docker-compose ps

# Test connection
docker-compose exec redis redis-cli ping
# Should respond: PONG

# Restart Redis
docker-compose restart redis
```

### Can't connect to database from local app
```bash
# Make sure you're using localhost in .env, not "postgres"
DATABASE_HOST=localhost  # ✅ Correct for dev
DATABASE_HOST=postgres   # ❌ Only works inside Docker network
```

### Hot reload not working
```bash
# Clear Vite cache
rm -rf apps/admin/node_modules/.vite
# Or on Windows
rmdir /s /q apps\admin\node_modules\.vite

# Restart dev server
pnpm --filter admin dev
```

### Need to reset everything
```bash
# Stop and remove containers + volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
pnpm --filter api migrate:latest
```

## Testing the Setup

### Test API
```bash
# Health check
curl http://localhost:3000/health

# Create tenant (when endpoint is ready)
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Tenant"}'
```

### Test Admin Dashboard
Open http://localhost:5173 in your browser

### Test Database
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U surveys_user -d surveys_dev

# List tables
\dt

# Exit
\q
```

### Test Redis
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Test commands
PING
SET test "hello"
GET test

# Exit
exit
```

## Production Deployment

```bash
# Build all apps
pnpm build

# Build Docker images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml --profile production up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Need Help?

- Full guide: [GETTING_STARTED.md](./GETTING_STARTED.md)
- UI specs: [admin-screens.md](./admin-screens.md)
- Documentation: [docs index](./README.md)
- Project info: [README.md](../README.md)

---

**Quick Tip:** Bookmark this file! It has everything you need for daily development. 🚀
