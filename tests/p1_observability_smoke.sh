#!/usr/bin/env bash
set -euo pipefail

APP_URL="${ACCOUNT_MANAGEMENT_URL:-http://localhost:3000}"
request_id="p1-observability-check"
headers="$(curl -fsSI -H "X-Request-ID: ${request_id}" "${APP_URL}/health")"
grep -q "^X-Request-ID: ${request_id}" <<<"${headers}"
metrics="$(curl -fsS "${APP_URL}/metrics")"
grep -q '^pondok_http_requests_total' <<<"${metrics}"
grep -q '^pondok_http_request_duration_ms_total' <<<"${metrics}"
echo "P1 observability smoke checks passed."
