# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/worker ./apps/worker

# Install dependencies
RUN pnpm install --frozen-lockfile

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm and tsx globally
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g tsx

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY --from=builder /app/apps/worker/src ./apps/worker/src

WORKDIR /app/apps/worker

ENV NODE_ENV=production

# Run TypeScript directly with tsx
CMD ["tsx", "src/index.ts"]
