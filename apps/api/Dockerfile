FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

COPY apps/api/ apps/api/
RUN npm run -w apps/api db:generate
RUN npm run -w apps/api build
RUN npm ci --omit=dev -w apps/api
RUN cp -r node_modules /app/node_modules_prod

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/node_modules_prod node_modules
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/src/generated apps/api/src/generated
COPY apps/api/prisma apps/api/prisma
COPY apps/api/package.json apps/api/package.json

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/main.js"]
