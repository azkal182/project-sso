#!/usr/bin/env bash
set -euo pipefail

APP_URL="${ACCOUNT_MANAGEMENT_URL:-http://localhost:3000}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"

health="$(curl -fsS "${APP_URL}/health")"
grep -q '"status":"UP"' <<<"${health}"
login_code="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_URL}/auth/login")"
test "${login_code}" = 302
unauth_code="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_URL}/api/applications")"
test "${unauth_code}" = 401
for route in users applications audit; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_URL}/api/${route}")"
  test "${code}" = 401
done
curl -fsS "${KEYCLOAK_URL}/realms/pondok/.well-known/openid-configuration" | grep -q 'authorization_endpoint'
csrf_cookie="$(mktemp)"
trap 'rm -f "${csrf_cookie}"' EXIT
csrf_response="$(curl -fsS -c "${csrf_cookie}" "${APP_URL}/auth/csrf")"
grep -q 'token' <<<"${csrf_response}"
csrf_code="$(curl -sS -o /dev/null -w '%{http_code}' -b "${csrf_cookie}" -X POST "${APP_URL}/api/applications" -H 'content-type: application/json' --data '{"code":"csrf-check","name":"CSRF check"}')"
test "${csrf_code}" = 403
echo "Phase 3 smoke checks passed."
