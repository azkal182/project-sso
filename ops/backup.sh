#!/usr/bin/env bash
set -euo pipefail

compose_file="${COMPOSE_FILE:-docker-compose.prod.yml}"
env_file="${PRODUCTION_ENV_FILE:-.env.production}"
backup_dir="${BACKUP_DIR:-./backups}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${backup_dir}"

docker compose --env-file "${env_file}" -f "${compose_file}" exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "${backup_dir}/keycloak-${timestamp}.dump"

docker compose --env-file "${env_file}" -f "${compose_file}" exec -T account-db \
  pg_dump -U account_management -d account_management --format=custom \
  > "${backup_dir}/account-management-${timestamp}.dump"

echo "Created PostgreSQL backups in ${backup_dir}"
