# Development seed

Seed data for browser testing is created through one Bun command and is safe to
run repeatedly. It uses Keycloak Admin REST for the identity/client records and
Drizzle for the application records; it does not require manual PostgreSQL
inserts.

```bash
SEED_ENABLED=true \
SEED_USERNAME=seed-browser-admin \
SEED_PASSWORD='use-a-local-password-at-least-12-chars' \
docker compose --env-file .env up -d keycloak-bootstrap

docker compose run --rm --no-deps \
  -e SEED_USERNAME=seed-browser-admin \
  -e SEED_PASSWORD='use-a-local-password-at-least-12-chars' \
  -e SEED_APPLICATION_CODE=seed-browser-app \
  -e SEED_CLIENT_ID=seed-browser-web \
  account-management bun run seed
```

`SEED_ENABLED=true` membuat user tersebut melalui bootstrap Keycloak dan
memberinya role `platform-admin`, sehingga dapat dipakai untuk full browser
testing. Jalankan bootstrap sebelum command seed aplikasi. Optional values juga
dapat supplied dengan `SEED_APPLICATION_CODE` dan `SEED_CLIENT_ID`. The command
refuses to run when `NODE_ENV=production`.
