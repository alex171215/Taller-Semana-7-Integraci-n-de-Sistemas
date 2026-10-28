FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/web-practica-Semana\ 7.html ./web-practica-Semana\ 7.html
COPY --from=builder /app/check-compatibility.js ./check-compatibility.js
COPY --from=builder /app/src/productos/schemas ./src/productos/schemas

EXPOSE 3000

CMD ["npm", "start"]
