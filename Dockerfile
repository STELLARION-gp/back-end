# ============================================
# Stage 1: Build Stage
# ============================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (includes devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript (skip lib check for deployment)
RUN npm run build || npx tsc --skipLibCheck -p tsconfig.production.json

# ============================================
# Stage 2: Production Stage
# ============================================
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache wget openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install only production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy necessary config files
COPY serviceAccountKey.json ./
COPY firebaseAdmin.ts ./

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
