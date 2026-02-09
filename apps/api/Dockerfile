# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY apps/embed ./apps/embed

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build embed widget only
RUN pnpm --filter embed build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm and tsx globally
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g tsx

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy source code, scripts (migrations), and built embed
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts
COPY --from=builder /app/apps/embed/dist ./apps/api/dist/client

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000

# Run TypeScript directly with tsx
CMD ["tsx", "src/index.ts"]
