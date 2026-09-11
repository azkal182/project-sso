# Development workflow — Bun + Docker watch mode

Backend NestJS dan frontend React/Vite menggunakan Bun secara konsisten.
Development dijalankan oleh Docker Compose dengan source code repository di-
mount ke container, sehingga perubahan file tidak memerlukan rebuild image.

## Menjalankan development stack

```bash
cp .env.example .env
docker compose --env-file .env up -d
docker compose --env-file .env ps
```

Endpoint:

- Frontend: http://localhost:5173/sign-in
- Account Management API: http://localhost:3000/health
- Keycloak: http://localhost:8080

Development Compose menggunakan target `development`:

- Vite melakukan HMR untuk perubahan `frontend/src`.
- Bun menjalankan NestJS dengan `--watch` dan mengikuti module graph source
  yang di-load oleh aplikasi.
- `node_modules` berada pada named volume agar mount source tidak menimpa
  dependency container.
- Proxy Vite mengarah ke `http://account-management:3000` di jaringan Compose.

```bash
docker compose logs -f account-management frontend
```

## Package manager

Kedua aplikasi mengunci Bun `1.3.14` melalui `packageManager` dan `bun.lock`.

```bash
cd account-management && bun install
cd ../frontend && bun install
```

`package-lock.json` dan `pnpm-lock.yaml` sudah tidak digunakan.

## Production build

Production Compose tetap menggunakan build multi-stage: Bun meng-install dan
build Account Management lalu menjalankan runtime production, sedangkan
frontend dibuild dengan Vite dan disajikan oleh Nginx.

```bash
PRODUCTION_ENV_FILE=.env.production.example \
docker compose --env-file .env.production.example \
  -f docker-compose.prod.yml build
```

Gunakan secret dan TLS configuration nyata saat deployment production.
