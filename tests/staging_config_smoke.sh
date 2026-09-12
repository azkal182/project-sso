#!/usr/bin/env bash
set -euo pipefail

env_file="${STAGING_ENV_FILE:-.env.staging.example}"
if [[ ! -f "${env_file}" ]]; then
  if [[ -f .env.production.example ]]; then
    env_file=.env.production.example
    echo "${STAGING_ENV_FILE:-.env.staging.example} not found; validating with ${env_file}. Set STAGING_ENV_FILE for a real staging env file." >&2
  else
    echo "Staging env file not found: ${env_file}" >&2
    exit 1
  fi
fi

docker_bin="${DOCKER_BIN:-}"
if [[ -z "${docker_bin}" ]]; then
  docker_bin="$(command -v docker || true)"
fi
if [[ -z "${docker_bin}" ]]; then
  for candidate in /usr/local/bin/docker /opt/homebrew/bin/docker /Applications/Docker.app/Contents/Resources/bin/docker; do
    if [[ -x "${candidate}" ]]; then docker_bin="${candidate}"; break; fi
  done
fi
if [[ -z "${docker_bin}" ]]; then
  echo "Docker CLI not found. Install/start Docker Desktop or set DOCKER_BIN=/path/to/docker." >&2
  exit 1
fi

PRODUCTION_ENV_FILE="${env_file}" "${docker_bin}" compose --env-file "${env_file}" -f docker-compose.prod.yml -f docker-compose.staging.yml config --quiet
echo "Staging Compose configuration passed."
