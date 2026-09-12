FROM oven/bun:1.4.0-alpine AS theme-builder

WORKDIR /build
COPY theme/package.json ./
RUN bun install --no-progress

COPY themes/pondok ./themes/pondok
RUN bun run build

FROM quay.io/keycloak/keycloak:26.0.7

COPY --from=theme-builder /build/themes/pondok /opt/keycloak/themes/pondok
