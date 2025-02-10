# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Add healthcheck
RUN apk add --no-cache wget

# Set environment variables
ENV NODE_ENV=production
ENV PORT=${PORT:-3005}

# Expose port
EXPOSE ${PORT:-3005}

# Start application
CMD ["npm", "start"]
