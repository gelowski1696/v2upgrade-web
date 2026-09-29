FROM node:22-alpine AS build

ARG BUILD_RELEASE=development
ARG BUILD_TIMESTAMP
ENV BUILD_RELEASE=${BUILD_RELEASE} BUILD_TIMESTAMP=${BUILD_TIMESTAMP}

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json ./
COPY scripts/write-build-info.mjs ./scripts/write-build-info.mjs
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginx:stable-alpine AS runtime

RUN apk upgrade --no-cache libexpat

COPY security-headers.conf /etc/nginx/security-headers.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ownerdashboard-posv2/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
