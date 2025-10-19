# Single-stage Dockerfile (compatible with older Docker hosts)
FROM node:18-alpine

# Install build & runtime dependencies
RUN apk add --no-cache python3 make g++ wget openssl

WORKDIR /app

# Copy package files for dependency installation and prisma schema
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (including devDeps) to allow TypeScript build
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript (allow emit even with type hints in CI)
RUN npm run build || npx tsc --skipLibCheck -p tsconfig.production.json

# Remove devDependencies to keep image slim (npm >=7 supports prune)
RUN npm prune --production || true

# Clean npm cache
RUN npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy necessary config files (already present from COPY . .)

# Create directories with proper permissions
RUN mkdir -p logs tmp-uploads public && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
