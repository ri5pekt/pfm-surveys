# Documentation Index

Welcome to the Survey Platform documentation. This directory contains all technical specifications, architectural decisions, and UI requirements.

## 📚 Documentation Structure

### Getting Started

- **[Quick Start Cheat Sheet](./QUICK_START.md)** ⚡ - Commands, troubleshooting, and daily workflow
- **[Getting Started Guide](./GETTING_STARTED.md)** - Complete setup guide for developers
- **[Project README](../README.md)** - Project overview and quick start
- **[About](./about.txt)** - High-level project description and architecture philosophy

### User Interface

- **[Admin Dashboard Screens](./admin-screens.md)** - Complete UI/UX specifications for all admin screens
- **[Screenshots Reference](./SCREENSHOTS.md)** - Visual guide mapping screenshots to screen specifications

### Architecture & Design

- **[Custom Event Trigger](./CUSTOM_EVENT_TRIGGER.md)** - Spec for `window.PFMSurveys.trigger()` timing mode
- **[Architecture Overview](./architecture.md)** _(to be created)_ - System design, data flow, and component interactions
- **[Decision Records](./decisions.md)** _(to be created)_ - Architectural decisions and their rationale

## 🎯 Quick Links by Role

### For Developers

1. Use [Quick Start Cheat Sheet](./QUICK_START.md) for daily commands and troubleshooting
2. Follow [Getting Started Guide](./GETTING_STARTED.md) for initial setup
3. Review [Admin Screens](./admin-screens.md) for UI requirements
4. Check [Screenshots](./SCREENSHOTS.md) for visual design reference

### For Designers

1. Review [Screenshots](./SCREENSHOTS.md) for current UI patterns
2. See [Admin Screens](./admin-screens.md) for complete screen specifications
3. Reference design system section in Admin Screens doc

### For Product/Project Managers

1. Read [Project README](../README.md) for feature overview
2. Review [About](../about.txt) for scope and principles
3. Check [Admin Screens](./admin-screens.md) for feature details

## 📋 Screen Specifications

All admin dashboard screens are documented with:

- Purpose and user goals
- Feature requirements
- Layout and component details
- Validation rules
- Navigation flows
- Empty states and error handling

### MVP Screens (Phase 1)

- ✅ Login screen
- ✅ Sites list and management
- ✅ Surveys list (with active/inactive tabs)
- ✅ Survey builder (with live preview)
- ✅ Survey results (charts + responses)

### Future Screens (Phase 2+)

- Dashboard/home with metrics
- Site users/team management
- Advanced settings
- Custom reports and exports

## 🏗️ Architecture Documents

### Coming Soon

The following documents will be added as the architecture is implemented:

- **architecture.md** - Detailed system architecture including:
    - Component diagram
    - Data flow diagrams
    - Database schema
    - API endpoint specifications
    - Queue architecture
    - Security model

- **decisions.md** - Architectural Decision Records (ADRs) documenting:
    - Why Node.js + Fastify
    - Why Kysely over an ORM
    - Why BullMQ for job processing
    - Why client-side identity in Phase 1
    - Why rollups over real-time aggregation
    - And other key technical decisions

## 🔧 Technical Stack Reference

### Backend

- **Runtime:** Node.js 20+
- **Framework:** Fastify
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Query Builder:** Kysely
- **Jobs:** Redis + BullMQ
- **Auth:** JWT (access + refresh tokens)

### Frontend (Admin Dashboard)

- **Framework:** Vue 3
- **Build Tool:** Vite
- **State Management:** Pinia
- **UI Library:** PrimeVue (Aura theme)
- **Language:** TypeScript
- **Routing:** Vue Router

### Embed Widget

- **Language:** Vanilla JavaScript
- **Build Tool:** Vite (library mode)
- **Delivery:** Async loader + versioned bundle

### Infrastructure

- **Containers:** Docker + Docker Compose
- **Reverse Proxy:** Caddy
- **Deployment:** Single VPS

## 📊 Data Model Overview

### Core Entities

- **Tenants** - Top-level organization
- **Sites** - Websites where surveys are embedded
- **Surveys** - Survey configurations and questions
- **Events** - Raw impression and interaction events (append-only)
- **Answers** - User responses to survey questions
- **Rollups** - Pre-aggregated daily statistics (disposable)

### Design Principles

- Raw events are immutable (append-only)
- Rollups are derived and disposable
- Watermark-based incremental aggregation
- No synchronous analytics during ingestion

## 🔐 Security Model

- **Embed Security:** HMAC-signed requests with timestamp validation and nonce replay prevention
- **Admin Auth:** JWT access tokens (15min) + refresh tokens (7 days)
- **Multi-tenancy:** Complete data isolation per tenant
- **Input Validation:** All external input treated as hostile

## 🚀 Development Workflow

**Hybrid Development Setup:**

- Infrastructure (PostgreSQL, Redis) in Docker containers
- Application code (API, Worker, Admin) runs locally for fast iteration

```bash
# Environment setup
cp .env.example .env

# Start infrastructure only (PostgreSQL + Redis in Docker)
docker-compose up -d

# Install dependencies
pnpm install

# Run migrations
pnpm --filter api migrate:latest

# Start dev servers (locally, not in Docker)
pnpm dev
```

**Services:**

- 🐳 PostgreSQL: `localhost:5432` (Docker)
- 🐳 Redis: `localhost:6379` (Docker)
- 💻 API: `http://localhost:3000` (local Node.js)
- 💻 Worker: background process (local Node.js)
- 💻 Admin: `http://localhost:5173` (local Vite with HMR)

See [Quick Start Cheat Sheet](./QUICK_START.md) for all commands.

## 📈 Roadmap

### Phase 1 (MVP)

- Core survey functionality
- Single-question surveys
- Basic targeting and triggers
- Results analytics
- Admin dashboard

### Phase 2 (Enhanced)

- Multi-question surveys
- Advanced targeting
- Team collaboration
- Export functionality
- Enhanced analytics

### Phase 3 (Advanced)

- Question branching logic
- A/B testing
- Session replay
- Text analysis
- Custom integrations

## 🧪 Testing geo targeting (logs)

When testing **Specific users** + **Geo location** targeting:

**Browser console (embed page):**

- `[PFM Surveys] 🚀 Initializing...` — script loaded
- `[PFM Surveys] ✓ Found N survey(s)` — surveys fetched
- If any survey has user (geo) rules: `[PFM Surveys] At least one survey has user (geo) rules; fetching userGeo now...` then `[PFM Surveys] userGeo for targeting:` with `{ country, region, city }` (or a warning if geo failed)
- For each survey: `[PFM Surveys] 🔍 Evaluating survey: "..."` with targeting and display settings
- Geo rule check: `[PFM Surveys] user rule (geo):` with **Survey rule** (what you set in Admin) vs **Visitor location (from IP)**; then either `user targeting: at least one geo rule matched` or `user targeting: no user rule matched` with visitor location and survey rules
- Final: `✓ Targeting rules matched` / `not shown (page or user targeting rules not met)` and frequency/sample logs

**API server logs (terminal where API runs):**

- `[PFM Surveys] Returning surveys; some have user (geo) rules` when `/api/public/surveys` returns surveys that have geo rules
- `[PFM Surveys] GET /api/public/geo: resolved userGeo for targeting` when `/api/public/geo` resolves the client IP (with `clientIp` and `userGeo` in the log payload)

If geo is not resolved (e.g. localhost or API/ip-api failure), embed will log `userGeo is null` and surveys with geo rules will be skipped.

## 🤝 Contributing

When adding documentation:

1. Keep it practical and example-driven
2. Include code samples where helpful
3. Update this index when adding new docs
4. Link between related documents
5. Use clear headings and structure

## 📞 Support

For questions about:

- **Setup:** See [Getting Started Guide](./GETTING_STARTED.md)
- **UI Requirements:** See [Admin Screens](./admin-screens.md)
- **Visual Design:** See [Screenshots](./SCREENSHOTS.md)
- **Project Scope:** See [About](./about.txt)

---

**Last Updated:** 2026-02-03
