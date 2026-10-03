# Backend (Express + Prisma). Enkel, självförsörjande image för självhosting.
FROM node:20-alpine

WORKDIR /app

# Installera beroenden
COPY package*.json ./
RUN npm ci

# Prisma-schema + klient
COPY prisma ./prisma
RUN npx prisma generate

# Källkod + bygg
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3101

# Kör migreringar och starta servern.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
