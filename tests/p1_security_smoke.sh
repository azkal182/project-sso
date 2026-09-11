#!/usr/bin/env bash
set -euo pipefail

APP_URL="${ACCOUNT_MANAGEMENT_URL:-http://localhost:3000}"

headers="$(curl -fsSI "${APP_URL}/health")"
grep -qi '^x-content-type-options: nosniff' <<<"${headers}"
grep -qi '^x-frame-options:' <<<"${headers}"

csrf_cookie="$(mktemp)"
trap 'rm -f "${csrf_cookie}"' EXIT
csrf_response="$(curl -fsS -c "${csrf_cookie}" "${APP_URL}/auth/csrf")"
grep -q 'token' <<<"${csrf_response}"
csrf_code="$(curl -sS -o /dev/null -w '%{http_code}' -b "${csrf_cookie}" -X POST "${APP_URL}/api/applications" -H 'content-type: application/json' --data '{"code":"p1-csrf-check","name":"P1 CSRF check"}')"
test "${csrf_code}" = 403

last_code=0
for _ in $(seq 1 21); do last_code="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_URL}/auth/login")"; done
test "${last_code}" = 429

echo "P1 security smoke checks passed."
