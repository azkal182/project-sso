#!/usr/bin/env bash
set -euo pipefail

APP_URL="${ACCOUNT_MANAGEMENT_URL:-http://localhost:3000}"

missing_token="$(curl -sS -o /dev/null -w '%{http_code}' "${APP_URL}/api/applications/00000000-0000-0000-0000-000000000000/authorization")"
test "${missing_token}" = 401
invalid_token="$(curl -sS -o /dev/null -w '%{http_code}' -H 'Authorization: Bearer invalid' "${APP_URL}/api/applications/00000000-0000-0000-0000-000000000000/authorization")"
test "${invalid_token}" = 401

echo "P1 authorization contract negative checks passed."
