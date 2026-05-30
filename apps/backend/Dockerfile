FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (need prisma for generate)
RUN npm install

# Generate Prisma client
RUN npx prisma generate

# Remove dev dependencies after prisma generate
RUN npm prune --omit=dev

# Copy source code
COPY . .

# Run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 serverlog
USER serverlog

# Expose port
EXPOSE 3010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3010/health || exit 1

ENTRYPOINT ["sh", "entrypoint.sh"]
