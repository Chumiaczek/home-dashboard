FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public

# Create config and custom backgrounds directories
RUN mkdir -p /app/config /app/public/backgrounds

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "server.js"]
