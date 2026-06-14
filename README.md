# PFM Surveys

> **Production-ready, self-hosted survey platform for embedding feedback widgets on any website.**

A complete multi-tenant survey solution that enables you to collect user feedback through embedded widgets, with real-time analytics, geolocation tracking, secure team management, and a beautiful modern admin dashboard.

**🌐 Live Demo:** [https://pfm-surveys.cloud](https://pfm-surveys.cloud) (Invite-only)

---

## ✨ Features

### Core Capabilities

-   🎯 **Multi-tenant Architecture** - Support multiple clients and sites with isolated data
-   🔒 **Secure Embed Script** - HMAC-signed requests prevent spoofing and replay attacks
-   ⚡ **Async Event Ingestion** - Non-blocking collection with Redis queue + background worker
-   📊 **Real-time Analytics** - Instant response charts and breakdowns
-   🌍 **Geolocation Tracking** - Automatic country/state/city detection from IP addresses
-   👥 **Team Management** - Invite-only access with email invitations (Hostinger SMTP)
-   🎨 **Modern Admin Dashboard** - Beautiful Vue 3 + PrimeVue interface
-   🐳 **Production-Ready** - Fully containerized with Docker Compose + Caddy reverse proxy
-   🔧 **100% TypeScript** - Full type safety across backend, frontend, and embed widget

### Survey Features

-   📝 **Visual Survey Builder** - Drag-and-drop editor with live preview
-   ❓ **Multiple Question Types** - Radio buttons, text input, multiple choice
-   💬 **Comment Fields** - Optional comments for any radio question
-   🎲 **Answer Randomization** - Randomize answer order, with pinnable options
-   🎯 **Advanced Targeting** - URL patterns, time-on-page triggers, sampling rates
-   ✅ **Custom Thank You Messages** - Personalized completion screens
-   📤 **Data Export** - Download responses as CSV or XLSX

### Security & Performance

-   🔐 **JWT Authentication** - 30-day sessions with auto-logout on expiration
-   🚦 **Rate Limiting** - Global, per-IP, and per-site limits
-   ♾️ **CORS Protection** - Configurable origins with domain validation
-   ⚡ **Optimized Caching** - Smart Nginx cache headers prevent stale assets
-   🛡️ **HTTPS Auto-Renewal** - Caddy handles SSL certificates automatically

## 🚀 Quick Start

### Development Setup (Recommended)

For fast iteration, run infrastructure in Docker and apps locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env
# Edit .env with your settings (see Configuration section below)

# 3. Start PostgreSQL + Redis in Docker
docker compose up -d postgres redis

# 4. Run database migrations
type apps\api\src\db\schema.sql | docker exec -i surveys-postgres psql -U surveys_user -d surveys_dev

# 5. Start all development servers (with hot reload)
pnpm dev
```

**What's running:**

-   🐳 PostgreSQL on `localhost:5432` (Docker container)
-   🐳 Redis on `localhost:6379` (Docker container)
-   💻 API on `http://localhost:3000` (local Node.js with tsx watch)
-   💻 Worker processing jobs (local Node.js with tsx watch)
-   💻 Admin dashboard on `http://localhost:5173` (Vite dev server with HMR)

**Access the admin:** Open [http://localhost:5173](http://localhost:5173) and create an account.

---

### Production Deployment

**Full deployment guide:** See **[DEPLOY.md](./DEPLOY.md)** for complete production deployment instructions.

**Quick production deploy:**

```bash
# On your VPS (all services in Docker)
git clone <your-repo>
cd pfm-surveys
cp .env.production .env
# Edit .env with production values

# Run migrations
type apps/api/src/db/schema.sql | docker exec -i <postgres-container> psql -U surveys_user -d surveys_prod

# Deploy all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Live production:** [https://pfm-surveys.cloud](https://pfm-surveys.cloud)

## 🎯 How to Use

### For Admins

1. **Login** → Access your dashboard at `https://yourdomain.com`
2. **Add Website** → Create a site and configure allowed domains
3. **Create Survey** → Use visual editor to build your survey
4. **Configure Targeting** → Set URL patterns, triggers, sampling
5. **Copy Embed Code** → Get the snippet for your website
6. **Paste on Website** → Add to your site's `<head>` or before `</body>`
7. **View Responses** → See real-time results with charts and filters
8. **Export Data** → Download as CSV or XLSX for analysis

### For Team Members

**Invitation Process:**

1. Admin invites you via email
2. You receive invitation with temporary password
3. Click link, login, set new password
4. Access all surveys and analytics

**No public registration** - Team access is invite-only for security.

---

## 🛠️ Tech Stack

### Backend

-   **Runtime:** Node.js 20+ with TypeScript
-   **API Framework:** Fastify (high performance)
-   **Database:** PostgreSQL 16 (with connection pooling)
-   **Query Builder:** Kysely (type-safe SQL)
-   **Queue System:** Redis + BullMQ (reliable job processing)
-   **Authentication:** JWT (30-day sessions)
-   **Email:** SMTP (Hostinger surveys@pfm-qa.com)
-   **Geolocation:** IP-API.com

### Frontend (Admin Dashboard)

-   **Framework:** Vue 3 + Composition API
-   **State Management:** Pinia
-   **UI Components:** PrimeVue
-   **Build Tool:** Vite
-   **Type Safety:** TypeScript
-   **HTTP Client:** Axios
-   **Charts:** Custom D3.js components

### Embed Widget

-   **Language:** Vanilla JavaScript (no dependencies)
-   **Build:** Vite (library mode, optimized bundle)
-   **Size:** ~27KB gzipped
-   **Loading:** Async, non-blocking

### Infrastructure

-   **Containers:** Docker & Docker Compose
-   **Reverse Proxy:** Caddy 2 (automatic HTTPS/SSL)
-   **Web Server:** Nginx Alpine (for admin static files)
-   **Process Manager:** Docker restart policies

## 🏗️ Architecture

### How It Works

1. **Create Survey** → Admin creates survey with targeting rules
2. **Get Embed Code** → Copy snippet to customer website
3. **Widget Loads** → Script loads asynchronously on visitor's page
4. **Smart Targeting** → Widget checks URL, time-on-page, frequency caps
5. **User Responds** → Answers sent to API with HMAC signature
6. **Queue Processing** → Worker processes events in background
7. **Real-time Analytics** → Admin sees results instantly

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Customer Website (particleformen.com)                       │
│  ┌──────────────┐                                           │
│  │ Embed Widget │  <script src="...pfm-surveys.cloud">    │
│  └──────┬───────┘  Loads async, shows survey to visitors    │
└─────────┼──────────────────────────────────────────────────┘
          │ POST /api/public/events (HMAC-signed)
          ▼
┌──────────────────────────────────────────────────────────────┐
│  Production Server (pfm-surveys.cloud)                      │
│                                                               │
│  ┌────────────┐  HTTPS    ┌──────────────┐                 │
│  │   Caddy    │ ────────► │  Nginx:80    │  Admin UI       │
│  │  (SSL/TLS) │           │  (Admin)     │  (Vue 3 SPA)    │
│  └─────┬──────┘           └──────────────┘                 │
│        │                                                     │
│        │ Proxy /api/*                                        │
│        ▼                                                     │
│  ┌─────────────┐          ┌──────────────┐                 │
│  │ Fastify API │ ───────► │    Redis     │  Job Queue      │
│  │  (Node.js)  │          │   (BullMQ)   │  + Cache        │
│  └─────┬───────┘          └──────┬───────┘                 │
│        │                          │                          │
│        │ JWT Auth                 │ Process Jobs             │
│        │ HMAC Verify              ▼                          │
│        │                   ┌──────────────┐                 │
│        │                   │   Worker     │  Process events  │
│        │                   │  (Node.js)   │  + Geolocation  │
│        │                   └──────┬───────┘                 │
│        │                          │                          │
│        ▼                          ▼                          │
│  ┌──────────────────────────────────┐                       │
│  │       PostgreSQL Database         │                       │
│  │  • users, teams, tenants          │                       │
│  │  • sites, surveys                 │                       │
│  │  • events, responses              │                       │
│  │  • worker_activity_logs           │                       │
│  └──────────────────────────────────┘                       │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

**Event Ingestion:**

1. Embed widget buffers events (5s or 10 events)
2. Batches sent to `/api/public/events` with HMAC signature
3. API validates HMAC, adds to Redis queue, responds 200 OK
4. Worker picks up job, enriches with geolocation, writes to database

**Response Viewing:**

1. Admin queries `/api/surveys/:id/responses`
2. API fetches from PostgreSQL with filters
3. Real-time charts and breakdowns rendered in Vue UI

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

## ✅ What's Built (v1.0)

### Survey Management

-   ✅ Survey creation and management
-   ✅ Single-question surveys (multiple-choice, text input, radio buttons)
-   ✅ Radio question enhancements (comments, randomization, pinned answers)
-   ✅ Custom thank you messages
-   ✅ Survey preview mode

### Targeting & Display

-   ✅ URL-based targeting (include/exclude patterns)
-   ✅ Time-on-page triggers
-   ✅ Sampling rates (show to X% of visitors)
-   ✅ Client-side frequency caps (show once per user)
-   ✅ Custom positioning and styling

### Data Collection

-   ✅ Secure event ingestion (HMAC-signed requests)
-   ✅ Geolocation tracking (country/state/city via IP)
-   ✅ Browser/OS detection
-   ✅ Anonymous user tracking (localStorage-based)
-   ✅ Session tracking
-   ✅ Page URL and timestamp capture

### Analytics & Reporting

-   ✅ Real-time response charts (bar charts, percentages)
-   ✅ Individual response viewer
-   ✅ Filter by question, date, location
-   ✅ CSV/XLSX export
-   ✅ Operations dashboard (worker activity logs)

### Team & Access Control

-   ✅ Multi-user team management
-   ✅ Invite-only access (email invitations via Mailjet)
-   ✅ User profiles and settings
-   ✅ Secure JWT authentication (30-day sessions)

### Infrastructure

-   ✅ Docker Compose deployment
-   ✅ Caddy reverse proxy with auto-SSL
-   ✅ Redis job queues with BullMQ
-   ✅ PostgreSQL with connection pooling
-   ✅ Health checks and monitoring
-   ✅ Rate limiting and CORS protection

### 🚧 Future Enhancements

-   Multi-question surveys (sequential questions)
-   Advanced targeting (user attributes, custom events)
-   Real-time notifications and alerts
-   Text response analysis (sentiment, keywords)
-   A/B testing capabilities
-   Session recordings
-   Webhook integrations

## ⚙️ Configuration

All configuration is managed through environment variables.

### Required Configuration

**For Development:**

1. Copy `.env.example` to `.env`
2. Set these required variables:

```env
# Database (Docker containers)
DATABASE_HOST=localhost
DATABASE_NAME=surveys_dev
DATABASE_USER=surveys_user
DATABASE_PASSWORD=change_this_password

# Redis (Docker container)
REDIS_HOST=localhost

# JWT Authentication
JWT_ACCESS_SECRET=your_jwt_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=30d

# Frontend API URL
VITE_API_BASE_URL=http://localhost:3000

# Admin URL (for email links)
ADMIN_URL=http://localhost:5173

# Email (SMTP - Hostinger surveys@pfm-qa.com)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=surveys@pfm-qa.com
SMTP_PASS=your_email_password
EMAIL_FROM_NAME=PFM Surveys

# Geolocation (Optional but recommended)
IP_API_KEY=your_ip_api_key  # From ip-api.com
```

**For Production:**

1. Use `.env.production` as template
2. Generate secure secrets:
    ```bash
    openssl rand -base64 32  # For JWT_SECRET
    ```
3. Update all URLs to your production domain
4. Configure SMTP (Hostinger mailbox surveys@pfm-qa.com)

**See:** [.env.production](./.env.production) for complete production template with all variables.

## 🚀 Deployment

### 📖 Complete Deployment Guide

**See [DEPLOY.md](./DEPLOY.md) for:**

-   Quick deploy commands for each service
-   Environment variable setup
-   Database migration instructions
-   Troubleshooting common issues
-   Rollback procedures
-   Health checks and monitoring

### Development vs Production

| Aspect             | Development               | Production                 |
| ------------------ | ------------------------- | -------------------------- |
| **Database/Redis** | Docker containers         | Docker containers          |
| **API/Worker**     | Local Node.js (tsx watch) | Docker containers          |
| **Admin**          | Vite dev server (HMR)     | Nginx serving static build |
| **Reverse Proxy**  | None (direct access)      | Caddy with auto-SSL        |
| **Hot Reload**     | ✅ Yes                    | ❌ No (rebuild required)   |
| **Performance**    | Slower (dev mode)         | Fast (optimized builds)    |

### Quick Production Deploy

**Prerequisites:**

-   VPS with Docker and Docker Compose installed
-   Domain pointing to VPS IP address
-   Hostinger mailbox (surveys@pfm-qa.com) or SMTP credentials

**Deploy:**

```bash
# 1. Clone repository
git clone <your-repo-url>
cd pfm-surveys

# 2. Configure environment
cp .env.production .env
nano .env  # Update all values

# 3. Deploy all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Run database migrations
cat apps/api/src/db/schema.sql | docker exec -i <postgres-container> psql -U surveys_user -d surveys_prod
```

**Your app will be live at:** `https://yourdomain.com`

**Tested on:** Hostinger VPS (Ubuntu 22.04, 2 vCPU, 4GB RAM) - handles 100K+ events/day easily.

## 📚 Documentation

### Essential Guides

-   **[DEPLOY.md](./DEPLOY.md)** 🚀 - Production deployment guide (start here!)
-   **[.env.production](./.env.production)** ⚙️ - Production environment template
-   **[Quick Start Cheat Sheet](./docs/QUICK_START.md)** ⚡ - Common commands and troubleshooting
-   **[Getting Started Guide](./docs/GETTING_STARTED.md)** 📖 - Complete local setup walkthrough

### UI/UX Documentation

-   [Admin Dashboard Screens](./docs/admin-screens.md) - Complete screen specifications
-   [Screenshots Reference](./docs/SCREENSHOTS.md) - Visual design guide with annotated screenshots

### Technical Documentation

-   [Documentation Index](./docs/README.md) - All documentation organized by topic
-   [Project Overview](./docs/about.txt) - High-level project description
-   [Architecture Overview](./docs/architecture.md) - System design and data flow _(coming soon)_
-   [Decision Records](./docs/decisions.md) - Architectural decisions _(coming soon)_

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

---

## 📊 Project Status

**Current Version:** v1.0.0
**Status:** ✅ **In Production** at [https://pfm-surveys.cloud](https://pfm-surveys.cloud)
**Last Updated:** February 2026

### Production Stats

-   🚀 Deployed on Hostinger VPS
-   🌍 Multi-tenant architecture
-   ⚡ Handles 100K+ events/day
-   🔒 Invite-only access with team management
-   📧 Email invitations via SMTP (Hostinger)
-   🌐 Geolocation tracking enabled
-   🔐 30-day JWT sessions

---

## 🤝 Contributing

This is a private production project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ for Particle for Men**
