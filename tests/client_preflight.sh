#!/usr/bin/env bash
set -euo pipefail

# Pre-integration checks for a registered client before implementing the client app.
# Secrets and bearer tokens are read silently and are never printed.

DEFAULT_SSO_URL="https://sso.amtsilatipusat.com"
DEFAULT_API_URL="https://admin.amtsilatipusat.com"

read -r -p "SSO base URL [${DEFAULT_SSO_URL}]: " SSO_URL
SSO_URL="${SSO_URL:-${DEFAULT_SSO_URL}}"
SSO_URL="${SSO_URL%/}"

read -r -p "Account Management base URL [${DEFAULT_API_URL}]: " API_URL
API_URL="${API_URL:-${DEFAULT_API_URL}}"
API_URL="${API_URL%/}"

read -r -p "Application ID (UUID): " APPLICATION_ID
read -r -p "OAuth client ID: " CLIENT_ID
read -r -p "Expected role code (optional): " EXPECTED_ROLE
read -r -p "Expected permission code (optional): " EXPECTED_PERMISSION
read -r -s -p "Access token (input hidden): " ACCESS_TOKEN
printf '\n'

if [[ -z "${APPLICATION_ID}" || -z "${CLIENT_ID}" || -z "${ACCESS_TOKEN}" ]]; then
  echo "Application ID, client ID, and access token are required." >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

request() {
  local output_file="$1"
  shift
  curl --silent --show-error --output "${output_file}" --write-out '%{http_code}' "$@"
}

assert_status() {
  local name="$1"
  local actual="$2"
  local expected="$3"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "FAIL ${name}: expected HTTP ${expected}, got ${actual}" >&2
    [[ -s "$4" ]] && sed -n '1,12p' "$4" >&2
    exit 1
  fi
  echo "PASS ${name}: HTTP ${actual}"
}

echo "== Client preflight =="
echo "SSO URL: ${SSO_URL}"
echo "API URL: ${API_URL}"
echo "Application ID: ${APPLICATION_ID}"
echo "Client ID: ${CLIENT_ID}"

discovery_file="${tmp_dir}/discovery.json"
status="$(request "${discovery_file}" "${SSO_URL}/realms/pondok/.well-known/openid-configuration")"
assert_status "OIDC discovery" "${status}" "200" "${discovery_file}"

if command -v jq >/dev/null 2>&1; then
  jq '{issuer, authorization_endpoint, token_endpoint, jwks_uri, end_session_endpoint}' "${discovery_file}"
else
  echo "INFO jq is not installed; discovery JSON was received but claims were not formatted."
fi

health_file="${tmp_dir}/health.txt"
status="$(request "${health_file}" "${API_URL}/health")"
assert_status "Account Management health" "${status}" "200" "${health_file}"
grep -q '"status":"UP"' "${health_file}" || {
  echo "FAIL Account Management health: response does not contain status UP" >&2
  sed -n '1,12p' "${health_file}" >&2
  exit 1
}
echo "PASS Account Management health payload"

unauth_file="${tmp_dir}/unauthorized.txt"
status="$(request "${unauth_file}" "${API_URL}/api/applications/${APPLICATION_ID}/authorization")"
assert_status "Authorization without token" "${status}" "401" "${unauth_file}"

invalid_file="${tmp_dir}/invalid-token.txt"
status="$(request "${invalid_file}" \
  -H 'Authorization: Bearer invalid' \
  "${API_URL}/api/applications/${APPLICATION_ID}/authorization")"
assert_status "Authorization with invalid token" "${status}" "401" "${invalid_file}"

authorization_file="${tmp_dir}/authorization.json"
curl_config="${tmp_dir}/curl.conf"
umask 077
cat >"${curl_config}" <<EOF
header = "Authorization: Bearer ${ACCESS_TOKEN}"
header = "Accept: application/json"
url = "${API_URL}/api/applications/${APPLICATION_ID}/authorization"
silent
show-error
output = "${authorization_file}"
write-out = "%{http_code}"
EOF
status="$(curl --config "${curl_config}")"
assert_status "Authorization contract" "${status}" "200" "${authorization_file}"

echo "Authorization response (token is not included):"
sed -n '1,80p' "${authorization_file}"

if command -v jq >/dev/null 2>&1; then
  if ! jq -e '(.applicationId and .clientId and .subject and (.roles | type == "array") and (.permissions | type == "array"))' "${authorization_file}" >/dev/null; then
    echo "FAIL Authorization response shape is invalid" >&2
    exit 1
  fi
  if [[ -n "${EXPECTED_ROLE}" ]] && ! jq -e --arg role "${EXPECTED_ROLE}" '.roles | index($role) != null' "${authorization_file}" >/dev/null; then
    echo "FAIL Expected role is missing: ${EXPECTED_ROLE}" >&2
    exit 1
  fi
  if [[ -n "${EXPECTED_PERMISSION}" ]] && ! jq -e --arg permission "${EXPECTED_PERMISSION}" '.permissions | index($permission) != null' "${authorization_file}" >/dev/null; then
    echo "FAIL Expected permission is missing: ${EXPECTED_PERMISSION}" >&2
    exit 1
  fi
  echo "PASS Authorization response shape and requested expectations"
else
  echo "INFO Install jq to validate role/permission expectations automatically."
fi

echo "All client preflight checks passed."
