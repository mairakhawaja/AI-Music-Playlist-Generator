# Build context: repository root (invoked with -f packages/backend/Dockerfile .)
# ---- Builder stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests and backend package.json for dependency resolution
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

# Install backend deps using workspaces
RUN npm ci --ignore-scripts -w packages/backend

# Copy backend source and compile
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/backend/src/ ./packages/backend/src/

WORKDIR /app/packages/backend
RUN npx tsc

# ---- Production stage ----
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy manifests and install production deps only
COPY package.json package-lock.json ./
COPY packages/backend/package.json ./packages/backend/

RUN npm ci --omit=dev --ignore-scripts -w packages/backend && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

# Switch to non-root user
USER appuser

EXPOSE 8080

# Cloud Run configuration:
#   - Port: 8080 (matches ENV PORT above)
#   - Concurrency: 80 requests per container instance
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
#   - SPOTIFY_REDIRECT_URI
#
# Secrets (loaded at runtime from Google Secret Manager via lib/secretManager.ts):
#   - SPOTIFY_CLIENT_SECRET
#   - CLAUDE_API_KEY
#   - JWT_SIGNING_KEY
#   - REFRESH_TOKEN_ENCRYPTION_KEY

CMD ["node", "packages/backend/dist/server.js"]
