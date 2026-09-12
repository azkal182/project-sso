FROM oven/bun:1.4.0-alpine AS theme-builder

WORKDIR /build/theme
COPY theme/package.json theme/bun.lock ./
RUN bun install --frozen-lockfile --no-progress

COPY themes/pondok /build/themes/pondok
RUN bun run build

FROM quay.io/keycloak/keycloak:26.0.7

COPY --from=theme-builder /build/themes/pondok /opt/keycloak/themes/pondok
