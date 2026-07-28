# ---- Builder stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests for dependency install
COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package manifests and install production deps only
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

EXPOSE 8080

# Cloud Run configuration:
#   - Port: 8080 (matches ENV PORT above)
#   - Concurrency: 80 requests per container instance (set in Cloud Run service config)
#   - Min instances: 0 (scale to zero when idle — free tier friendly)
#   - Max instances: 3
#   - Memory: 256 MB
#   - CPU: 1 vCPU
#
# Environment variables (non-secret, set in Cloud Run service config):
#   - NODE_ENV=production
#   - PORT=8080
#   - SPOTIFY_CLIENT_ID
#   - FRONTEND_URL
#
# Secrets (loaded at runtime from Google Secret Manager via lib/secretManager.ts):
#   - SPOTIFY_CLIENT_SECRET
#   - CLAUDE_API_KEY
#   - JWT_SIGNING_KEY
#   - REFRESH_TOKEN_ENCRYPTION_KEY

CMD ["node", "dist/server.js"]
