# ============================================
# Stage 1: Build Stage
# ============================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy everything first (to ensure all files are available)
COPY . .

# Show directory structure for debugging
RUN echo "Listing contents of current directory:" && ls -la && \
    echo "Listing contents of prisma directory:" && ls -la ./prisma/ || echo "Prisma directory not found!"

# Create the prisma schema file manually if it doesn't exist
RUN if [ ! -f ./prisma/schema.prisma ]; then \
    echo "Prisma schema not found, creating it manually..." && \
    mkdir -p ./prisma && \
    echo 'generator client { \
      provider = "prisma-client-js" \
      output   = "./generated/client" \
      binaryTargets = ["native", "darwin-arm64", "windows", "linux-musl"] \
    } \
    \
    datasource db { \
      provider = "postgresql" \
      url      = env("DATABASE_URL") \
    }' > ./prisma/schema.prisma && \
    echo "Created schema.prisma file:" && \
    cat ./prisma/schema.prisma; \
    fi

# Install ALL dependencies (including devDependencies for build)
RUN npm i

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

# Copy package files and prisma directory
COPY package*.json ./
COPY prisma ./prisma

# Show directory structure for debugging in production stage
RUN echo "PRODUCTION STAGE: Listing contents of current directory:" && ls -la && \
    echo "PRODUCTION STAGE: Listing contents of prisma directory:" && ls -la ./prisma/ || echo "Prisma directory not found in production stage!"

# Create the prisma schema file manually if it doesn't exist in production stage
RUN if [ ! -f ./prisma/schema.prisma ]; then \
    echo "Prisma schema not found in production, creating it manually..." && \
    mkdir -p ./prisma && \
    echo 'generator client { \
      provider = "prisma-client-js" \
      output   = "./generated/client" \
      binaryTargets = ["native", "darwin-arm64", "windows", "linux-musl"] \
    } \
    \
    datasource db { \
      provider = "postgresql" \
      url      = env("DATABASE_URL") \
    }' > ./prisma/schema.prisma && \
    echo "Created schema.prisma file in production:" && \
    cat ./prisma/schema.prisma; \
    fi

# Install only production dependencies
RUN npm i --only=production && \
    npm cache clean --force

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
