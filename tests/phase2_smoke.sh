#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${KEYCLOAK_URL:-http://localhost:8080}"
MANAGEMENT_URL="${KEYCLOAK_MANAGEMENT_URL:-http://localhost:9000}"
MGMT_CLIENT="${MANAGEMENT_CLIENT_CLIENT_ID:-account-management-service}"
MANAGEMENT_CLIENT_SECRET="${MANAGEMENT_CLIENT_SECRET:-change-me-local-management-secret}"

curl -fsS "${MANAGEMENT_URL}/health/ready" >/dev/null
discovery="$(curl -fsS "${BASE_URL}/realms/pondok/.well-known/openid-configuration")"
grep -q '"issuer"' <<<"${discovery}"
jwks="$(curl -fsS "${BASE_URL}/realms/pondok/protocol/openid-connect/certs")"
grep -q '"keys"' <<<"${jwks}"
metrics="$(curl -fsS "${MANAGEMENT_URL}/metrics")"
grep -q 'jvm_memory' <<<"${metrics}"

token="$(curl -fsS -X POST "${BASE_URL}/realms/pondok/protocol/openid-connect/token" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=client_credentials \
  --data-urlencode client_id="${MGMT_CLIENT}" \
  --data-urlencode client_secret="${MANAGEMENT_CLIENT_SECRET}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
test -n "${token}"
clients="$(curl -fsS "${BASE_URL}/admin/realms/pondok/clients?clientId=account-management" \
  -H "Authorization: Bearer ${token}")"
grep -q 'account-management' <<<"${clients}"

echo "Phase 1/2 smoke checks passed."
