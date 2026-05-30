# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/worker ./apps/worker

# Install all deps (including devDeps for tsup)
RUN pnpm install --frozen-lockfile

# Compile Worker TypeScript → single ESM bundle (eliminates tsx + esbuild daemon at runtime)
RUN npm install -g tsup
WORKDIR /app/apps/worker
RUN tsup src/index.ts --format esm --no-dts --target node20

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
