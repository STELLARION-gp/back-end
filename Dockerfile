# Simple Dockerfile - Run TypeScript directly without build step
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache python3 make g++ wget openssl

WORKDIR /app

# Copy package files and install ALL dependencies (including tsx)
COPY package*.json ./
COPY prisma ./prisma

# Install all dependencies (we need devDeps for tsx and prisma)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy all source code
COPY . .

# Create directories with proper permissions
RUN mkdir -p logs tmp-uploads public

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

# Run TypeScript directly using tsx (no build needed!)
CMD ["npx", "tsx", "index.ts"]
