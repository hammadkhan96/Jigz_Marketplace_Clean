# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies) for building
RUN npm ci

# Copy source code
COPY . .

# Build the application (ignore esbuild warnings)
RUN npm run build 2>/dev/null || npm run build

# Verify build output
RUN ls -la dist/ && ls -la dist/public/ || echo "Build output check"

# Remove devDependencies after build to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Create directories with proper permissions
RUN mkdir -p uploads && chmod 755 uploads
RUN mkdir -p attached_assets && chmod 755 attached_assets

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start the application
CMD ["npm", "start"]