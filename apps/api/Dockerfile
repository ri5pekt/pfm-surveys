# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/embed ./apps/embed

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build shared package, embed widget, and API
RUN pnpm --filter shared build || true
RUN pnpm --filter embed build
RUN pnpm --filter api build

# Copy built embed script into API dist so it can be served
RUN mkdir -p /app/apps/api/dist/client && cp /app/apps/embed/dist/embed.js /app/apps/api/dist/client/embed.js

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts (includes dist/client/embed.js from builder)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/index.js"]
