# ──────────────────────────────────────────────
# Stage 1: Dependencies
# ──────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# ──────────────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Add non-root user for security
RUN addgroup -S cohort && adduser -S cohort -G cohort

WORKDIR /app

# Copy installed deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove .env if accidentally copied (use K8s secrets instead)
RUN rm -f .env

# Change ownership to non-root user
RUN chown -R cohort:cohort /app
USER cohort

EXPOSE 5000

# Health check — ensures the container is alive before receiving traffic
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/ || exit 1

CMD ["node", "index.js"]
