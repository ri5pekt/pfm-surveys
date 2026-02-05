# Survey Platform

> Self-hosted, multi-tenant survey platform for embedding surveys on external websites.

A production-ready system for collecting user feedback through embedded surveys, with secure ingestion, background analytics processing, and a modern admin dashboard.

## Features

-   🎯 **Multi-tenant architecture** - Support multiple clients and sites
-   🔒 **Secure embed script** - HMAC-signed requests prevent spoofing and replay attacks
-   ⚡ **Async ingestion** - Non-blocking event collection with background processing
-   📊 **Pre-aggregated analytics** - Fast dashboards via incremental rollups
-   🎨 **Modern admin UI** - Built with Vue 3 and PrimeVue
-   🐳 **Docker-ready** - Easy deployment with Docker Compose
-   🔧 **Type-safe** - Full TypeScript coverage across backend and frontend

## Quick Start

**Development Setup (Hybrid Approach):**

-   Infrastructure (PostgreSQL, Redis) runs in Docker
-   Application code (API, Worker, Admin) runs locally for fast HMR and iteration

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start infrastructure only (PostgreSQL + Redis in Docker)
docker-compose up -d

# Run migrations (when ready)
pnpm --filter api migrate:latest

# Start all development servers (locally, not in Docker)
pnpm dev
```

This starts:

-   🐳 PostgreSQL on `localhost:5432` (Docker)
-   🐳 Redis on `localhost:6379` (Docker)
-   💻 API on `http://localhost:3000` (local Node.js with auto-restart)
-   💻 Worker processing jobs (local Node.js)
-   💻 Admin dashboard on `http://localhost:5173` (local Vite with HMR)

**Production:** All services run in Docker containers. See production build section below.

**📖 Documentation:**

-   [Quick Start Cheat Sheet](./docs/QUICK_START.md) - Commands and troubleshooting
-   [Full Getting Started Guide](./docs/GETTING_STARTED.md) - Complete setup walkthrough

## Tech Stack

**Backend**

-   Node.js 20+ with TypeScript
-   Fastify (API framework)
-   PostgreSQL (primary database)
-   Kysely (type-safe SQL query builder)
-   Redis + BullMQ (job queues)
-   JWT authentication

**Frontend**

-   Vue 3 + Vite + Pinia
-   PrimeVue (UI components)
-   TypeScript

**Embed Widget**

-   Vanilla JavaScript
-   Vite (library mode)
-   Lightweight async loader

**Infrastructure**

-   Docker & Docker Compose
-   Caddy (reverse proxy & HTTPS)

## Architecture

```
┌─────────────┐
│   Embed     │  Vanilla JS widget on customer sites
│   Script    │
└──────┬──────┘
       │ HMAC-signed events
       ▼
┌─────────────┐
│     API     │  Fastify + JWT auth
│   Service   │  Validates & enqueues events
└──────┬──────┘
       │ BullMQ
       ▼
┌─────────────┐
│  Background │  Consumes queue jobs
│   Workers   │  Writes events & builds rollups
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │  Raw events + pre-aggregated rollups
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Admin    │  Vue 3 dashboard
│  Dashboard  │  Survey management & analytics
└─────────────┘
```

## Project Structure

```
pfm-surveys/
├── apps/
│   ├── api/          # Backend API (Fastify + TypeScript)
│   ├── worker/       # Background workers (BullMQ)
│   ├── admin/        # Admin dashboard (Vue 3)
│   └── embed/        # Embed widget (Vanilla JS)
├── docs/
│   ├── architecture.md
│   └── decisions.md
├── docker-compose.yml
├── .env.example
└── GETTING_STARTED.md
```

## Development

```bash
# Install dependencies
pnpm install

# Run linters
pnpm lint

# Run type checking
pnpm type-check

# Build all apps
pnpm build

# Run tests
pnpm test
```

See [GETTING_STARTED.md](./GETTING_STARTED.md) for detailed development instructions.

## Key Design Principles

-   **Non-blocking ingestion** - API responds immediately, workers persist asynchronously
-   **Append-only events** - Raw data is immutable and serves as source of truth
-   **Disposable rollups** - Pre-aggregated stats can be rebuilt from raw events
-   **Client-side identity** - Anonymous user IDs stored in localStorage (Phase 1)
-   **Silent failures** - Embed errors never affect host websites
-   **Deterministic aggregation** - Watermark-based rollup processing

## Admin Dashboard

The admin interface provides a complete survey management experience:

-   **Authentication** - Secure login with JWT tokens
-   **Site Management** - Add websites, configure domains, copy embed codes
-   **Survey Builder** - Visual editor with live preview, question types (radio, text, multiple choice)
    -   Radio question enhancements: Comment fields, randomization, pinned answers
    -   Custom thank you messages
-   **Targeting Rules** - URL patterns, time-on-page, sampling rates
-   **Results Analytics** - Bar charts, percentage breakdowns, response counts
-   **Response Viewer** - Individual responses with browser/OS, location, page URLs and timestamps
-   **Export Functionality** - Download results as CSV or XLSX

See [Admin Dashboard Screens](./docs/admin-screens.md) for detailed UI specifications.

## MVP Scope

**Included:**

-   Survey creation and management
-   Single-question surveys (multiple-choice and text)
-   Radio question enhancements (comments, randomization, pinned answers)
-   Custom thank you messages
-   URL-based targeting
-   Time-on-page triggers and sampling
-   Client-side frequency caps
-   Secure event ingestion (HMAC)
-   User location tracking (IP geolocation)
-   Browser/OS detection
-   Daily rollups and analytics
-   Admin dashboard with all core screens

**Excluded (future phases):**

-   Multi-question surveys
-   Advanced targeting rules
-   Multi-user team management
-   Text analysis
-   Session recordings
-   Alerts and notifications

## Configuration

All configuration is managed through environment variables. Copy `.env.example` to `.env` and customize:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=surveys_dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
API_PORT=3000
JWT_ACCESS_SECRET=your_secret_here

# Worker
WORKER_CONCURRENCY=5
ROLLUP_INTERVAL_MS=60000
```

See `.env.example` for all available options.

## Deployment

### Development vs Production

**Development:**

-   PostgreSQL and Redis in Docker (for consistency)
-   API, Worker, and Admin run locally (for fast iteration)
-   Use `docker-compose up -d` (only starts DB and Redis)
-   Use `pnpm dev` to start application services

**Production:**

-   All services containerized (API, Worker, Admin, DB, Redis, Caddy)
-   Caddy provides automatic HTTPS
-   Static admin assets served efficiently
-   Use dedicated `docker-compose.prod.yml`

### Single VPS Deployment (Docker Compose)

```bash
# Build production images (includes Vue app build)
docker-compose -f docker-compose.prod.yml build

# Start production stack with Caddy reverse proxy
docker-compose -f docker-compose.prod.yml --profile production up -d
```

The platform is designed to run efficiently on a single VPS and can handle low millions of events per day.

## Documentation

### Quick Links

-   **[Quick Start Cheat Sheet](./docs/QUICK_START.md)** ⚡ - Common commands and troubleshooting
-   **[Getting Started Guide](./docs/GETTING_STARTED.md)** 📖 - Complete setup walkthrough
-   **[Documentation Index](./docs/README.md)** 📚 - All documentation organized by topic

### Detailed Docs

-   [Admin Dashboard Screens](./docs/admin-screens.md) - Complete UI/UX requirements and screen specifications
-   [Screenshots Reference](./docs/SCREENSHOTS.md) - Visual design guide with annotated screenshots
-   [Architecture Overview](./docs/architecture.md) - System design and data flow _(coming soon)_
-   [Decision Records](./docs/decisions.md) - Architectural decisions and rationale _(coming soon)_
-   [Project Overview](./docs/about.txt) - High-level project description

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

---

**Status:** v0.1.0 - MVP Complete ✅ Ready for production deployment 🚀
