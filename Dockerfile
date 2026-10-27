# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build -- --webpack

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN useradd --system --uid 1001 handmader
COPY --from=builder --chown=handmader:handmader /app/public ./public
COPY --from=builder --chown=handmader:handmader /app/.next/standalone ./
COPY --from=builder --chown=handmader:handmader /app/.next/static ./.next/static
USER handmader
EXPOSE 3000
CMD ["node", "server.js"]
