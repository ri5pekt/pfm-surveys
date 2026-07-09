# PFM Surveys - Production Deployment Guide

Quick reference guide for deploying updates to production at `https://pfm-surveys.cloud`

---

## 🚀 Full Deploy (After Git Pull)

After you pull changes on the server, **rebuild backend and frontend containers, apply migrations, then bring services up.**

```bash
# 1. SSH to VPS and go to project
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud

# 2. Pull latest changes
git pull

# 3. Rebuild all app containers (backend: api, worker; frontend: admin)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api worker admin

# 4. Apply database migrations (run inside API container)
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api pnpm migrate:latest

# 5. Start/restart all services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Order matters:** Rebuild first (so the API image includes latest code and migrations), then run migrations, then `up -d`.

---

## 🚀 Quick Deploy (Single Service)

### Deploy Frontend Changes (Admin Dashboard)

```bash
# 1. Commit and push your changes
git add apps/admin/
git commit -m "Update admin feature"
git push

# 2. SSH to VPS and deploy
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build admin
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d admin
```

### Deploy API Changes

```bash
# 1. Commit and push your changes
git add apps/api/
git commit -m "Update API feature"
git push

# 2. SSH to VPS and deploy
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api
```

### Deploy Worker Changes

```bash
# 1. Commit and push your changes
git add apps/worker/
git commit -m "Update worker feature"
git push

# 2. SSH to VPS and deploy
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d worker
```

### Deploy Embed Widget Changes

```bash
# 1. Commit and push your changes
git add apps/embed/
git commit -m "Update embed widget"
git push

# 2. SSH to VPS and deploy
# NOTE: Embed is built with API, so rebuild API
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d api
```

---

## 📝 Environment Variables

### Adding a New Environment Variable

**If you need to add a new environment variable:**

1. **Update `.env.production` template** (for documentation):

    ```bash
    # Add your variable with a comment explaining what it's for
    NEW_VARIABLE=default_value_here
    ```

2. **Add to `docker-compose.prod.yml`** in the appropriate service:

    ```yaml
    services:
        api: # or worker, admin, etc.
            environment:
                NEW_VARIABLE: ${NEW_VARIABLE}
    ```

3. **Update production `.env` on VPS**:

    ```bash
    ssh root@2.24.70.59
    cd /var/www/pfm-surveys.cloud
    echo 'NEW_VARIABLE=production_value' >> .env
    ```

4. **Recreate the affected service**:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api
    ```

---

## 🗄️ Database Migrations

### Running Database Migrations

**Preferred (after full deploy):** Migrations are in git and run via the API container:

```bash
cd /var/www/pfm-surveys.cloud
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api pnpm migrate:latest
```

**When you add new database changes:**

1. **Create migration SQL file** in `apps/api/src/db/migrations/` (e.g. `YYYYMMDD_description.sql`). Migration files are tracked in git (see `.gitignore` exception).

2. **Deploy:** After `git pull`, run the full deploy steps above; step 4 runs all pending migrations.

3. **Verify (optional):**
    ```bash
    ssh root@2.24.70.59 "docker exec -i surveys-postgres psql -U surveys_user -d surveys_prod -c '\\dt'"
    ```

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch dynamically imported module"

**Cause:** Browser cached old index.html after deployment
**Solution:** Have users hard refresh: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
**Prevention:** Already fixed with nginx cache headers (no action needed)

### Issue: Users getting logged out / 401 errors

**Cause:** JWT token expired or JWT_SECRET not set
**Solution:**

```bash
# Check if JWT_SECRET is set
ssh root@2.24.70.59 "cat /var/www/pfm-surveys.cloud/.env | grep JWT_SECRET"

# If empty, generate and set:
ssh root@2.24.70.59 "openssl rand -base64 32"
# Copy the output, then:
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && echo 'JWT_SECRET=<paste-secret-here>' >> .env && echo 'JWT_ACCESS_EXPIRES_IN=30d' >> .env"
# Recreate API:
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api"
```

### Issue: Geolocation not working

**Cause:** IP_API_KEY not set
**Solution:**

```bash
# Check if set
ssh root@2.24.70.59 "cat /var/www/pfm-surveys.cloud/.env | grep IP_API_KEY"

# If empty, add it (get key from local .env):
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && echo 'IP_API_KEY=<your-key>' >> .env"
# Recreate worker:
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate worker"
```

### Issue: Emails not sending

**Cause:** SMTP (Hostinger) configuration or credentials
**Solution:**

1. **Check environment variables**:

    ```bash
    ssh root@2.24.70.59 "docker exec pfm-surveys-prod-api-1 printenv | grep SMTP"
    ```

2. **Verify Hostinger mailbox (surveys@pfm-qa.com)**
    - Ensure the mailbox exists in hPanel (Emails → Email accounts)
    - Use the correct password for `SMTP_PASS`
    - Hostinger SMTP: smtp.hostinger.com, port 465 (SSL)

3. **Update if needed**:
    ```bash
    ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && cat .env"
    # Edit SMTP_USER and SMTP_PASS to match Hostinger mailbox
    ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api"
    ```

---

## 🔍 Debugging Commands

### Check Service Status

```bash
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose ps"
```

### View Logs

```bash
# API logs
ssh root@2.24.70.59 "docker logs pfm-surveys-prod-api-1 --tail=100"

# Worker logs
ssh root@2.24.70.59 "docker logs pfm-surveys-prod-worker-1 --tail=100"

# Admin logs (nginx)
ssh root@2.24.70.59 "docker logs pfm-surveys-prod-admin-1 --tail=100"

# Follow logs in real-time (Ctrl+C to exit)
ssh root@2.24.70.59 "docker logs -f pfm-surveys-prod-api-1"
```

### Check Environment Variables

```bash
# API
ssh root@2.24.70.59 "docker exec pfm-surveys-prod-api-1 printenv"

# Worker
ssh root@2.24.70.59 "docker exec pfm-surveys-prod-worker-1 printenv"
```

### Restart Services

```bash
# Restart single service
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose restart api"

# Restart all services
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose restart"
```

### Connect to Database

```bash
ssh root@2.24.70.59 "docker exec -it pfm-surveys-prod-postgres-1 psql -U surveys_user -d surveys_prod"

# Common queries:
# \dt                    -- List tables
# \d table_name          -- Describe table
# SELECT * FROM users;   -- Query data
# \q                     -- Exit
```

---

## 🎯 Deployment Checklist

**Before deploying:**

- [ ] Test changes locally with `pnpm dev`
- [ ] Commit all changes with clear commit message
- [ ] Push to GitHub

**For frontend changes (Admin):**

- [ ] Remember: `VITE_API_BASE_URL` is baked in at build time
- [ ] If you changed API URL, rebuild admin container

**For API changes:**

- [ ] If you changed routes, update frontend accordingly
- [ ] If you added database changes, run migrations
- [ ] If you added environment variables, update `.env` on VPS

**After deploying:**

- [ ] Check service logs for errors
- [ ] Test the deployed feature on https://pfm-surveys.cloud

- [ ] Monitor logs for 5 minutes to catch any immediate issues

---

## 🔒 Security: Database & Cache Network Isolation

**Postgres and Redis must NEVER be reachable from the public internet.** Unauthenticated public
Redis is the #1 cause of XMRig cryptominer RCE incidents on VPS hosts (bots scan `0.0.0.0:6379`
within hours of exposure).

### What's enforced (as of 2026-07-09)

- `docker-compose.yml` and `docker-compose.prod.yml` bind Postgres/Redis to **`127.0.0.1`** only
  (`127.0.0.1:5432:5432`, `127.0.0.1:6379:6379`) — never `0.0.0.0`.
- Redis **requires a password** (`--requirepass`) even though the port is localhost-only — this is
  defense-in-depth in case a container is ever compromised and tries to pivot over the internal
  Docker network (`redis:6379` is reachable without a host port at all).
- `REDIS_PASSWORD` must be set in production `.env` (generate with `openssl rand -hex 24`). If
  unset, Redis falls back to a well-known dev-only placeholder — **do not run production without
  setting this**.

> **Incident history:** on 2026-07-09, `surveys-postgres` and `surveys-redis` were found bound to
> `0.0.0.0:5432` / `0.0.0.0:6379` on the production VPS with no `REDIS_PASSWORD` set. Root cause:
> `docker-compose.prod.yml` didn't explicitly override `ports:`/`command:` for these services, so
> Compose inherited the dev-oriented public port bindings from the base `docker-compose.yml` when
> both files were merged (`-f docker-compose.yml -f docker-compose.prod.yml`). Fixed by binding to
> `127.0.0.1` in **both** files (so neither file alone can leak a public binding) and requiring a
> Redis password everywhere.

### Applying this fix to an existing deployment

```bash
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud

# 1. Take a full backup first (DB dump + Redis snapshot + .env) — see "Rollback" section below
#    for the exact commands, or ask the Cursor agent to do it.

# 2. Set a strong REDIS_PASSWORD in .env
echo "REDIS_PASSWORD=$(openssl rand -hex 24)" >> .env
# (remove any pre-existing empty REDIS_PASSWORD= line first if present)

# 3. Pull the fix and recreate postgres/redis (data persists via named volumes — no data loss)
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate postgres redis

# 4. Recreate api/worker so they pick up REDIS_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate api worker

# 5. Verify — should show 127.0.0.1, NOT 0.0.0.0
ss -tlnp | grep -E ':5432|:6379'

# 6. Verify from your local machine — should time out / refuse, NOT connect
nc -zv 2.24.70.59 6379
nc -zv 2.24.70.59 5432

# 7. Confirm the app still works end-to-end
curl https://pfm-surveys.cloud/health
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50 api worker
```

### Post-deploy security checklist (run periodically, not just after this fix)

- [ ] `ss -tlnp | grep '0.0.0.0'` — nothing sensitive besides 22/80/443
- [ ] `ss -tlnp | grep -E ':5432|:6379'` — shows `127.0.0.1`, not `0.0.0.0`
- [ ] `nc -zv <VPS_IP> 6379` and `5432` from your local machine — both refuse/timeout
- [ ] `REDIS_PASSWORD` in `.env` is a strong, unique value (not the dev placeholder)
- [ ] `ufw status` — firewall active, only 22/80/443 open
- [ ] `crontab -l` and `ps aux | grep -i xmrig` — no miner/malicious cron

---

## 🚨 Rollback (If Something Goes Wrong)

### Quick Rollback

```bash
ssh root@2.24.70.59
cd /var/www/pfm-surveys.cloud

# 1. Go back to previous commit
git log --oneline -10  # Find the commit hash to rollback to
git reset --hard <previous-commit-hash>

# 2. Rebuild and restart affected services
docker compose -f docker-compose.yml -f docker-compose.prod.yml build api admin worker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 Health Checks

### Check if everything is running correctly:

```bash
# Quick health check
curl https://pfm-surveys.cloud/health

# Detailed status
ssh root@2.24.70.59 "cd /var/www/pfm-surveys.cloud && docker compose ps"
```

Expected output:

- All containers should show "Up" status
- API should show "(healthy)"
- Admin should be serving on port 3001
- API should be serving on port 3000

---

## 💡 Tips

1. **Always test locally first** before deploying to production
2. **Use clear commit messages** - they help when you need to rollback
3. **Deploy during low-traffic times** when possible
4. **Monitor logs after deployment** for at least 5 minutes
5. **Keep `.env` file backed up** - it contains all secrets
6. **Document any manual changes** you make to the VPS

---

## 📞 Emergency Contacts

- **VPS:** Hostinger VPS at `2.24.70.59`
- **Domain:** `pfm-surveys.cloud` (DNS managed by domain provider)
- **Email Service:** Hostinger mailbox (surveys@pfm-qa.com, SMTP)
- **Repository:** GitHub - ri5pekt/pfm-surveys

---

## 🔐 Important Files on VPS

```
/var/www/pfm-surveys.cloud/
├── .env                          # Production environment variables (KEEP SECRET!)
├── docker-compose.prod.yml       # Production Docker Compose config
└── backups/                      # Database backups (if configured)

/etc/nginx/sites-available/
└── pfm-surveys.cloud             # Nginx reverse proxy config (Certbot-managed SSL)
```

---

## 🎓 Learning Resources

- **Docker Compose docs:** https://docs.docker.com/compose/
- **Fastify docs:** https://fastify.dev/
- **Vue 3 docs:** https://vuejs.org/
- **Caddy docs:** https://caddyserver.com/docs/

---

_Last updated: 2026-05-07_
