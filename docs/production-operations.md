# Production Operations

## Topology

Production uses two public HTTPS hostnames behind `reverse-proxy`:

- `sso.example.com`: Keycloak public OIDC endpoints.
- `admin.example.com`: Account Management.

Keycloak port `9000` is an internal management interface only. It is not published by `docker-compose.prod.yml`; health and metrics are reachable only from the container network or an explicitly restricted observability sidecar. The Keycloak Admin Console is restricted in Nginx to private RFC1918 networks.

TLS terminates at Nginx. Mount the certificate and key at `deploy/tls/tls.crt` and `deploy/tls/tls.key` from a secret manager or certificate automation system. Do not commit certificates or private keys.

## Deployment

1. Copy `.env.production.example` to `.env.production`.
2. Replace every placeholder using the secret manager. Keep `MANAGEMENT_CLIENT_SECRET` separate from bootstrap admin credentials.
3. Mount TLS files and verify DNS for both hostnames.
4. Start with:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

5. Verify `https://sso.example.com/realms/pondok/.well-known/openid-configuration` and `https://admin.example.com/health`.
6. Restrict access to ports 80/443 at the network boundary and allow management/metrics only from observability networks.

## Staging deployment

Staging uses the same production image topology and Keycloak bootstrap, but
isolates its volumes and exposes non-production ports. It does not require the
production TLS mount or start the production reverse proxy:

```bash
cp .env.staging.example .env.staging
# replace every staging placeholder with secret-manager values
PRODUCTION_ENV_FILE=.env.staging \
  docker compose --env-file .env.staging \
  -f docker-compose.prod.yml -f docker-compose.staging.yml \
  config --quiet
PRODUCTION_ENV_FILE=.env.staging \
  docker compose --env-file .env.staging \
  -f docker-compose.prod.yml -f docker-compose.staging.yml \
  up -d --build
```

Staging endpoints are `http://localhost:8180` for Keycloak,
`http://localhost:8173` for the admin frontend, and
`http://localhost:8300/health` for backend health. Run the Phase 1/2, Phase 3,
P1 security, P1 authorization, and P1 observability smoke tests against these
endpoints before accepting a release candidate.

## Runtime security controls

Account Management fails fast when required runtime configuration is missing. In
production, `SESSION_SECRET`, the OIDC client secret, and the management client
secret must be injected from the secret manager; placeholder values and
non-HTTPS public URLs are rejected at startup. The bootstrap admin credential is
not accepted as a runtime management credential.

The backend applies per-client-IP request limits in each process:

- login: `RATE_LIMIT_LOGIN_MAX` per minute;
- OIDC callback: `RATE_LIMIT_CALLBACK_MAX` per minute;
- API: `RATE_LIMIT_API_MAX` per minute.

The default limits are intentionally conservative for a pilot. For a
multi-instance deployment, put a shared rate-limit store or gateway limit in
front of the service; the process-local limiter remains a defense-in-depth
control, not a replacement for an edge limiter.

## Observability and reliability

Every backend response includes `X-Request-ID`. A valid incoming request ID is
preserved; otherwise the backend generates a UUID. The backend emits one JSON
`http.request` event per response with request ID, method, path, status code, and
duration. Do not log access tokens, cookies, authorization headers, or query
strings containing secrets.

`GET /metrics` exposes Prometheus-compatible request counters and total request
duration. In production, expose this endpoint only to the observability network
through the reverse proxy or an internal service route.

Keycloak Admin API calls use a bounded timeout configured by
`KEYCLOAK_REQUEST_TIMEOUT_MS` (default 5 seconds). Safe idempotent operations
(`GET`, `PUT`, and `DELETE`) retry transient failures up to two times. Create
operations are not retried automatically to avoid duplicate resources; callers
use the existing compensation paths when a later database operation fails.

## Backup and restore

Run `ops/backup.sh` from a host with Docker access. It creates custom-format dumps for both PostgreSQL ownership boundaries. Store them encrypted and off-host.

Restore into stopped services or an isolated staging stack first:

```bash
pg_restore --clean --if-exists --no-owner -U keycloak -d keycloak keycloak-YYYYMMDDTHHMMSSZ.dump
pg_restore --clean --if-exists --no-owner -U account_management -d account_management account-management-YYYYMMDDTHHMMSSZ.dump
```

After restore, run the smoke tests and the reconciliation report before serving traffic. Test restore procedures regularly; a backup that has not been restored is not considered verified.

## Reconciliation

`ops/reconcile.sh` is a read-only report for local user references and OAuth-client mappings whose Keycloak resource is missing. Run it with a runtime service-account secret and a database connection string. Investigate and repair drift through Account Management or an approved maintenance procedure; never edit Keycloak tables directly.

## Upgrade and rotation

Keycloak is pinned to `26.0.7`. Before an upgrade, read release notes, create verified backups, test the production compose file in staging, run OIDC/admin API/E2E tests, and only then update the image tag. Rotate `MANAGEMENT_CLIENT_SECRET`, `ACCOUNT_MANAGEMENT_CLIENT_SECRET`, and `SESSION_SECRET` through the secret manager. Bootstrap admin credentials are provisioning-only and must not be used by Account Management at runtime.
