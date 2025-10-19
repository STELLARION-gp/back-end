# ============================================
# Stage 1: Build Stage
# ============================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm i

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN ls -la ./prisma/ && echo "Checking Prisma schema..." && cat ./prisma/schema.prisma || echo "Schema not found!"
RUN npx prisma generate

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 2: Production Stage
# ============================================
FROM node:18-alpine AS production

# Install runtime dependencies and wget for healthcheck
RUN apk add --no-cache wget openssl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm i --only=production && \
    npm cache clean --force

# Copy Prisma schema and generate client for production
COPY prisma ./prisma
RUN ls -la ./prisma/ && echo "Checking Prisma schema in production stage..." && cat ./prisma/schema.prisma || echo "Schema not found in production stage!"
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy other necessary files
COPY --from=builder /app/serviceAccountKey.json ./serviceAccountKey.json
COPY --from=builder /app/firebaseAdmin.ts ./firebaseAdmin.ts

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/tmp-uploads /app/public && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
