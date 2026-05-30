# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/worker ./apps/worker

# Install all deps
RUN pnpm install --frozen-lockfile

# Compile Worker TypeScript → single ESM bundle
# esbuild handles TypeScript natively (no separate typescript install needed)
# --packages=external keeps node_modules as runtime imports
RUN npm install -g esbuild
RUN esbuild apps/worker/src/index.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=esm \
    --packages=external \
    --outfile=apps/worker/dist/index.js

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled JS bundle (not TypeScript source — no esbuild daemon needed)
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker

ENV NODE_ENV=production

# Plain node — one process, no transpiler overhead
CMD ["node", "dist/index.js"]
