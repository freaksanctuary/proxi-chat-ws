FROM node:22-alpine AS base
WORKDIR /app

# -----------------
# deps
# -----------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# -----------------
# builder
# -----------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# -----------------
# runner
# -----------------
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
