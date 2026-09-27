# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install libc compat for native modules (e.g. pg)
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
# Copy the local SDK that is referenced via "file:sdk/core"
COPY sdk/ sdk/

RUN npm ci --ignore-scripts

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/sdk ./sdk
COPY . .

# Next.js collects telemetry – opt out for reproducible builds
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a non-root user/group for the app process
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy the standalone bundle produced by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Static files (/_next/static) are NOT bundled in standalone – copy them separately
COPY --from=builder --chown=nextjs:nodejs /app/.next/static  ./.next/static
# Public folder (images, fonts, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public

USER nextjs

EXPOSE 3000

# server.js is the standalone entrypoint emitted by Next.js
ENTRYPOINT ["node", "server.js"]
