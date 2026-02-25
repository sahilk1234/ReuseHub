# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all deps (including dev) for building
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reusenet -u 1001

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder --chown=reusenet:nodejs /app/dist ./dist

# Create uploads directory for local file storage
RUN mkdir -p uploads && chown reusenet:nodejs uploads

# Switch to non-root user
USER reusenet

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
