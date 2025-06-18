FROM node:18-alpine
RUN apk add --no-cache openssl

# Install pnpm globally
RUN npm install -g pnpm

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml* ./
COPY prisma/ /app/prisma/


RUN pnpm install --prod && pnpm store prune
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN pnpm remove @shopify/cli

COPY . .

RUN pnpm run build

CMD ["pnpm", "run", "docker-start"]