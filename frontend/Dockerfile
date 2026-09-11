# Krepton Analytics SPA — Vite build, nginx-unprivileged runtime (non-root, port 8080).
# VITE_* values are baked in at build time. Pass them as build args, never as runtime secrets.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

ARG VITE_API_URL=http://localhost:3001
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_PADDLE_CLIENT_TOKEN=
ARG VITE_PADDLE_ENV=sandbox
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_PADDLE_CLIENT_TOKEN=$VITE_PADDLE_CLIENT_TOKEN
ENV VITE_PADDLE_ENV=$VITE_PADDLE_ENV

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

USER root

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
