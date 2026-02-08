# VPS Setup Commands for Hostinger

Run these commands on your Hostinger VPS after SSH'ing in: `ssh root@31.220.56.146`

## Step 1: Check Existing Project Structure

```bash
# Check if /var/www exists and see existing projects
ls -la /var/www/

# Check if there's a Caddyfile for other projects
find /etc/caddy -name "Caddyfile*" 2>/dev/null || echo "Caddy not found in /etc/caddy"
find /var/www -name "Caddyfile*" 2>/dev/null || echo "No Caddyfiles in /var/www"

# Check if Docker is already installed
docker --version || echo "Docker not installed"
docker compose version || echo "Docker Compose not installed"

# Check existing running containers
docker ps -a 2>/dev/null || echo "No docker containers"
```

## Step 2: Install Prerequisites (if needed)

```bash
# Update system
apt update && apt upgrade -y

# Install Docker (if not installed)
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose plugin (if not installed)
if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose..."
    apt install docker-compose-plugin -y
fi

# Install Git (if not installed)
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt install git -y
fi

# Verify installations
docker --version
docker compose version
git --version
```

## Step 3: Create Project Directory

```bash
# Create directory in /var/www (matching other projects structure)
mkdir -p /var/www/surveys.pfm-qa.com
cd /var/www/surveys.pfm-qa.com
```

## Step 4: Clone Repository

```bash
# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/pfm-surveys.git .

# Verify files
ls -la
```

## Step 5: Generate Secrets

```bash
# Generate JWT and HMAC secrets (run 3 times, save each output)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate strong database password
openssl rand -base64 32
```

## Step 6: Create Production .env File

```bash
# Copy template
cp .env.production .env

# Edit with production values
nano .env
```

**Update these values in .env:**

-   `DATABASE_PASSWORD` - Use the password from Step 5
-   `POSTGRES_PASSWORD` - Same as DATABASE_PASSWORD
-   `JWT_ACCESS_SECRET` - First secret from Step 5
-   `JWT_REFRESH_SECRET` - Second secret from Step 5
-   `HMAC_SECRET` - Third secret from Step 5
-   `SMTP_USER` - surveys@pfm-qa.com
-   `SMTP_PASS` - Hostinger mailbox password

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 7: Configure Firewall

```bash
# Check if ufw is active
ufw status

# If not active, configure it
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Verify
ufw status
```

## Step 8: Check for Existing Caddy

```bash
# Check if Caddy is already running (from other projects)
docker ps | grep caddy

# If Caddy is running, you may need to:
# 1. Stop it temporarily
# 2. Merge Caddyfiles
# 3. Use a different approach

# Check what's listening on ports 80 and 443
netstat -tlnp | grep -E ':(80|443)'
```

## Step 9: Deploy!

```bash
cd /var/www/surveys.pfm-qa.com

# Make deploy script executable
chmod +x scripts/deploy-prod.sh

# Run deployment
bash scripts/deploy-prod.sh
```

The script will:

1. Validate .env configuration
2. Build all Docker images (takes 5-10 minutes)
3. Start PostgreSQL and Redis
4. Run database migrations
5. Start API, Worker, Admin, and Caddy
6. Perform health checks

## Step 10: Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Test API health (in another terminal)
curl http://localhost:3000/health

# Check Caddy SSL certificate status
docker compose -f docker-compose.prod.yml logs caddy | grep -i certificate
```

## Step 11: Access the Application

Visit `https://surveys.pfm-qa.com` in your browser.

Caddy will automatically request and install an SSL certificate from Let's Encrypt on the first request (takes 30-60 seconds).

## Troubleshooting

### If ports 80/443 are already in use:

```bash
# Find what's using the ports
netstat -tlnp | grep -E ':(80|443)'

# If it's another Caddy instance, you need to integrate Caddyfiles
# OR use a different port and configure a reverse proxy
```

### If Caddy fails to get SSL certificate:

```bash
# Check DNS is pointing to this server
dig +short surveys.pfm-qa.com

# Should return: 31.220.56.146

# Check Caddy logs for detailed error
docker compose -f docker-compose.prod.yml logs caddy
```

### If admin panel shows "Connection failed":

```bash
# Rebuild admin with correct API URL
docker compose -f docker-compose.prod.yml build admin
docker compose -f docker-compose.prod.yml up -d admin
```

## Useful Commands

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f worker

# Restart a service
docker compose -f docker-compose.prod.yml restart api

# Stop all services
docker compose -f docker-compose.prod.yml down

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Run database migrations (after code update)
docker compose -f docker-compose.prod.yml exec api pnpm migrate:latest

# Backup database
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U surveys_user surveys_prod > backup_$(date +%Y%m%d).sql

# View resource usage
docker stats
```

## Next Steps

After successful deployment:

1. Create your first admin user (will need to create via database or seed script)
2. Set up automated backups (cron job)
3. Configure monitoring
4. Test the survey embed on a test website
