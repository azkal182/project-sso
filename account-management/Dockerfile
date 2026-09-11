FROM oven/bun:1.3.14-alpine AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM dependencies AS development
ENV NODE_ENV=development
COPY tsconfig.json nest-cli.json ./
COPY src ./src
COPY migrations ./migrations
EXPOSE 3000
CMD ["bun", "--watch", "src/main.ts"]

FROM dependencies AS build
COPY tsconfig.json nest-cli.json ./
COPY src ./src
COPY migrations ./migrations
RUN bun run build

FROM oven/bun:1.3.14-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
USER bun
EXPOSE 3000
CMD ["bun", "dist/main.js"]
