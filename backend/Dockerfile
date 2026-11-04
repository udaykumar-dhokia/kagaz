# Production Dockerfile for Kagaz Backend on Render / Cloud
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy source code and config
COPY . .

# Expose default fallback port (Render automatically overrides via PORT env variable)
EXPOSE 4000

# Start Kagaz Backend
CMD ["bun", "src/index.ts"]

