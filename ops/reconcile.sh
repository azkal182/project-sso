#!/usr/bin/env bash
set -euo pipefail

: "${KEYCLOAK_URL:=http://localhost:8080}"
: "${MANAGEMENT_CLIENT_SECRET:?MANAGEMENT_CLIENT_SECRET is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

token="$(curl -fsS -X POST "${KEYCLOAK_URL}/realms/pondok/protocol/openid-connect/token" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=client_credentials \
  --data-urlencode client_id=account-management-service \
  --data-urlencode client_secret="${MANAGEMENT_CLIENT_SECRET}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
test -n "${token}"

echo "== Local users without a Keycloak counterpart =="
psql "${DATABASE_URL}" -Atc 'select keycloak_user_id from users' | while read -r user_id; do
  if ! curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/users/${user_id}" -H "Authorization: Bearer ${token}" >/dev/null 2>&1; then
    echo "local user missing in Keycloak: ${user_id}"
  fi
done

echo "== OAuth mappings with missing Keycloak client =="
psql "${DATABASE_URL}" -Atc 'select keycloak_client_uuid from application_oauth_clients' | while read -r client_id; do
  if ! curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/clients/${client_id}" -H "Authorization: Bearer ${token}" >/dev/null 2>&1; then
    echo "local client mapping missing in Keycloak: ${client_id}"
  fi
done

echo "Reconciliation report completed. No changes were made."
