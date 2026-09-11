#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_ENV_FILE=.env.staging.example docker compose --env-file .env.staging.example -f docker-compose.prod.yml -f docker-compose.staging.yml config --quiet
echo "Staging Compose configuration passed."
