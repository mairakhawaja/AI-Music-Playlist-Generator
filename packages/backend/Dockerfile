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

# Copy package manifests and install production deps only
COPY package.json package-lock.json* ./

RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]
