#!/usr/bin/env bash
set -euo pipefail

: "${KEYCLOAK_URL:=http://localhost:8080}"
: "${MANAGEMENT_CLIENT_SECRET:?MANAGEMENT_CLIENT_SECRET is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"
command -v curl >/dev/null
command -v psql >/dev/null
command -v jq >/dev/null

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

token="$(curl -fsS -X POST "${KEYCLOAK_URL}/realms/pondok/protocol/openid-connect/token" \
  -H 'content-type: application/x-www-form-urlencoded' \
  --data-urlencode grant_type=client_credentials \
  --data-urlencode client_id=account-management-service \
  --data-urlencode client_secret="${MANAGEMENT_CLIENT_SECRET}" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')"
test -n "${token}"

echo "== Local users without a Keycloak counterpart =="
psql "${DATABASE_URL}" -Atc 'select keycloak_user_id from users' >"${work_dir}/local_users"
psql "${DATABASE_URL}" -Atc 'select keycloak_client_uuid from application_oauth_clients' >"${work_dir}/local_clients"

while read -r user_id; do
  [ -z "${user_id}" ] && continue
  if ! curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/users/${user_id}" -H "Authorization: Bearer ${token}" >/dev/null 2>&1; then
    echo "local user missing in Keycloak: ${user_id}"
  fi
done <"${work_dir}/local_users"

echo "== Keycloak users without a local counterpart =="
curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/users?max=1000" -H "Authorization: Bearer ${token}" | jq -r '.[].id' >"${work_dir}/keycloak_users"
while read -r user_id; do
  [ -z "${user_id}" ] && continue
  if ! grep -Fxq "${user_id}" "${work_dir}/local_users"; then
    echo "Keycloak user missing local reference: ${user_id}"
  fi
done <"${work_dir}/keycloak_users"

echo "== OAuth mappings with missing Keycloak client =="
while read -r client_id; do
  [ -z "${client_id}" ] && continue
  if ! curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/clients/${client_id}" -H "Authorization: Bearer ${token}" >/dev/null 2>&1; then
    echo "local client mapping missing in Keycloak: ${client_id}"
  fi
done <"${work_dir}/local_clients"

echo "== Keycloak clients without a local mapping =="
curl -fsS "${KEYCLOAK_URL}/admin/realms/pondok/clients?max=1000" -H "Authorization: Bearer ${token}" | jq -r '.[] | select(.clientId != "account-management" and .clientId != "account-management-service" and .clientId != "account" and .clientId != "account-console" and .clientId != "admin-cli" and .clientId != "broker" and .clientId != "realm-management" and .clientId != "security-admin-console") | [.id, .clientId] | @tsv' >"${work_dir}/keycloak_clients"
while IFS=$'\t' read -r client_uuid client_id; do
  [ -z "${client_uuid}" ] && continue
  if ! grep -Fxq "${client_uuid}" "${work_dir}/local_clients"; then
    echo "Keycloak client missing local mapping: ${client_id} (${client_uuid})"
  fi
done <"${work_dir}/keycloak_clients"

echo "Reconciliation report completed. No changes were made."
