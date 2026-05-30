# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY apps/api ./apps/api
COPY apps/embed ./apps/embed

# Install all deps (including devDeps for tsup)
RUN pnpm install --frozen-lockfile

# Build embed widget
RUN pnpm --filter embed build

# Compile API TypeScript → single ESM bundle (eliminates tsx + esbuild daemon at runtime)
# Run from workspace root (/app) so tsup can find typescript in /app/node_modules
RUN npm install -g tsup
RUN tsup apps/api/src/index.ts --format esm --no-dts --target node20 --out-dir apps/api/dist

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# tsx is kept only for running migration scripts (not the server process)
RUN npm install -g tsx

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

# Copy compiled JS bundle (not TypeScript source — no esbuild daemon needed)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Migration scripts still use tsx — copy source for those
COPY --from=builder /app/apps/api/scripts ./apps/api/scripts

# Embed widget
COPY --from=builder /app/apps/embed/dist ./apps/api/dist/client

WORKDIR /app/apps/api

ENV NODE_ENV=production

EXPOSE 3000

# Plain node — one process, no transpiler overhead
CMD ["node", "dist/index.js"]
