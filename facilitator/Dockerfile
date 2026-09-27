# Verge standalone facilitator — minimal production image
FROM node:22-alpine AS builder
WORKDIR /app
COPY facilitator/package.json facilitator/package-lock.json* ./
COPY sdk ./sdk
RUN npm install
COPY facilitator/server.ts tsconfig.json ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S facilitator -u 1001
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER facilitator
EXPOSE 3399
ENV FACILITATOR_PORT=3399 NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3399/health || exit 1
ENTRYPOINT ["node", "dist/server.js"]
