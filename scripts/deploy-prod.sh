#!/bin/bash
set -e

echo "🚀 Production Deployment Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    exit 1
fi

# Validate .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "   Create .env from .env.example and configure production values"
    exit 1
fi

# Check for insecure default values
echo "🔍 Validating environment configuration..."

if grep -q "change_this" .env; then
    echo -e "${RED}❌ Error: .env contains default values (change_this)${NC}"
    echo "   Update all secrets before deploying to production"
    exit 1
fi

# Check required environment variables
required_vars=("DATABASE_PASSWORD" "JWT_SECRET" "DOMAIN")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
        echo -e "${RED}❌ Error: ${var} not set in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Environment validation passed${NC}"

# Build images
echo ""
echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed${NC}"

# Run database migrations
echo ""
echo "📦 Running database migrations..."

# Start only postgres and redis for migrations
docker-compose -f docker-compose.prod.yml up -d postgres redis

# Wait for postgres to be ready
echo "   Waiting for PostgreSQL..."
sleep 5

# Run migrations using the API container
docker-compose -f docker-compose.prod.yml run --rm api pnpm migrate:latest

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Migration failed${NC}"
    docker-compose -f docker-compose.prod.yml down
    exit 1
fi

echo -e "${GREEN}✓ Migrations completed${NC}"

# Deploy all services
echo ""
echo "🚢 Deploying services..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Services deployed${NC}"

# Wait for health checks
echo ""
echo "🏥 Waiting for services to be healthy..."
sleep 10

# Check API health
DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)
echo "   Checking API health at https://${DOMAIN}/health"

# Note: In production, this would check the actual domain
# For now, we'll just check if containers are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Services are running${NC}"
else
    echo -e "${RED}❌ Some services failed to start${NC}"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
fi

# Show running services
echo ""
echo "📊 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "🌐 Your survey platform is now running at:"
echo "   https://${DOMAIN}"
echo ""
echo "📝 Next steps:"
echo "   1. Visit https://${DOMAIN} to access the admin panel"
echo "   2. Create your first site and embed the survey script"
echo "   3. Monitor logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker-compose -f docker-compose.prod.yml logs -f [service]"
echo "   - Restart: docker-compose -f docker-compose.prod.yml restart [service]"
echo "   - Stop: docker-compose -f docker-compose.prod.yml down"
echo "   - Backup DB: docker exec postgres pg_dump -U \$DATABASE_USER \$DATABASE_NAME > backup.sql"
echo ""
