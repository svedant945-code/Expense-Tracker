FROM node:22-alpine AS base
RUN apk add --no-cache openssl

FROM base AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY src ./src
ENV DATABASE_URL=postgresql://build:build@localhost:5432/expense_tracker \
    DIRECT_URL=postgresql://build:build@localhost:5432/expense_tracker
RUN npx prisma generate --schema prisma/schema.prisma && npm run build

FROM base AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    API_PREFIX=/api/v1

COPY package.json ./
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
