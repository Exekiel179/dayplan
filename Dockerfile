FROM node:22-alpine AS builder

WORKDIR /app

# Native modules (e.g. better-sqlite3 on alpine/musl) may need build tooling.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/technical-rss-seeds.mjs ./technical-rss-seeds.mjs
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "server.mjs"]
