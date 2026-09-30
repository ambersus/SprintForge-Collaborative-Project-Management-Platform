# ── SprintForge Frontend ─────────────────────────────────────────────────────
# Multi-stage build. Stage 1 builds the Next.js standalone bundle;
# Stage 2 runs it in a minimal Node image.
# node:22-alpine is an official multi-arch image — works on linux/amd64 and linux/arm64.

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Copy lockfile and manifests first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# Copy source and build the production bundle.
# NEXT_PUBLIC_* values used at build time must be provided via --build-arg.
COPY . .

ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

RUN npm run build

# ── Stage 2: Runner ──────────────────────────────────────────────────────────
# next.config.mjs already sets output: 'standalone', which produces a minimal
# self-contained server in .next/standalone — no node_modules needed at runtime.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# Copy only what the standalone server needs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public 2>/dev/null || true

USER app

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
