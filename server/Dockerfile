FROM oven/bun:1-slim AS base
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN --mount=type=cache,id=buncache,target=/root/.bun/install/cache bun install

FROM base AS build
COPY tsconfig.json .
COPY ./src ./src
ENV NODE_ENV="production"
RUN bun build --production --target=bun --outdir=./dist ./src/index.ts

FROM oven/bun:1-slim AS release
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/dist ./
ENV NODE_ENV="production"
EXPOSE 3000

CMD ["bun", "index.js"]
