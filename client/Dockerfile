FROM oven/bun:1-slim AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,id=buncache,target=/root/.bun/install/cache bun install

FROM base AS builder
WORKDIR /app
ARG API_URL
ARG NODE_URL
ARG CHAIN_ID

ENV NODE_ENV=production
ENV VITE_FUN_API_URL=${API_URL}
ENV VITE_PUBLIC_NODE_URL=${NODE_URL}
ENV VITE_PUBLIC_CHAIN=${CHAIN_ID}

COPY . .
RUN --mount=type=cache,id=vitecache,target=/app/node_modules/.vite bun run build

FROM nginx:alpine

# Remove default Nginx welcome page and configuration
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

# Copy the build output from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
# The actual nginx.conf will be mounted via ConfigMap in Kubernetes
# or via docker-compose for local testing.
CMD ["nginx", "-g", "daemon off;"]