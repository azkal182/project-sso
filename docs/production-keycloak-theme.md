# Production — Custom Keycloak Login Theme

Panduan ini menerapkan custom login theme `pondok` pada Keycloak production
di satu VPS yang sudah memakai Nginx host. Theme ditanam ke custom image
Keycloak melalui build stage Bun dan tidak membuka port baru ke internet.

## Prasyarat

- Repository sudah berada di directory deployment, contoh `/opt/project-sso`.
- File `/opt/project-sso/.env.production` sudah diisi dan tidak masuk Git.
- Docker Engine dan Docker Compose v2 tersedia.
- Nginx host tetap menjadi terminator TLS dan reverse proxy.
- Override `docker-compose.vps.yml` digunakan agar service hanya bind ke
  loopback high ports `18080`–`18082`.

Periksa file environment sebelum deployment:

```bash
cd /opt/project-sso
test -f .env.production
chmod 600 .env.production
```

## Validasi Compose

Jalankan validasi menggunakan file yang sama dengan deployment:

```bash
cd /opt/project-sso

PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  config --quiet
```

Jika command tidak menghasilkan output dan exit code `0`, konfigurasi valid.

## Build dan deploy custom theme

Build ini menggunakan Bun di dalam Docker untuk menghasilkan CSS Tailwind,
kemudian menyalin theme ke image Keycloak. Jalankan hanya service yang
berubah terlebih dahulu:

```bash
cd /opt/project-sso

PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  up -d --build keycloak
```

Setelah Keycloak healthy, jalankan bootstrap agar realm existing juga
di-update ke `loginTheme=pondok`:

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  run --rm keycloak-bootstrap
```

Jika bootstrap sukses, pastikan service lain tetap berjalan:

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  up -d account-management frontend
```

## Verifikasi deployment

Periksa status container:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  ps
```

Expected result:

- `keycloak` berstatus `healthy`.
- `account-management` berstatus `healthy`.
- `postgres` dan `account-db` berstatus `healthy`.
- `frontend` berstatus `Up`.
- Tidak ada port database atau port `9000` yang dipublish ke public interface.

Verifikasi endpoint melalui Nginx/Cloudflare:

```bash
curl -fsS \
  https://sso.example.com/realms/pondok/.well-known/openid-configuration

curl -fsS https://admin.example.com/health
```

Untuk melihat theme, buka URL authorization OAuth client yang valid. Halaman
login harus menampilkan branding “Pondok Pesantren Darul Falah Amtsilati”.
Uji minimal:

1. Login dengan credential valid.
2. Login dengan password salah dan pastikan error tampil tanpa stack trace.
3. Buka `Lupa password?` dan pastikan flow reset tetap berjalan.
4. Uji tampilan pada desktop dan viewport mobile.
5. Pastikan callback kembali ke redirect URI client yang terdaftar.

## Troubleshooting

Lihat log Keycloak dan bootstrap:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  logs --tail=200 keycloak keycloak-bootstrap
```

Jika theme belum terlihat, jalankan ulang bootstrap setelah Keycloak healthy.

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  run --rm keycloak-bootstrap
```

Browser dapat menyimpan asset theme melalui cache. Gunakan hard refresh atau
private window ketika memverifikasi perubahan visual.

## Rollback

Simpan image tag/commit yang sedang berjalan sebelum deployment. Jika build
theme menyebabkan masalah, kembalikan repository ke release sebelumnya,
kemudian build ulang image dan jalankan service Keycloak:

```bash
cd /opt/project-sso

PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  up -d --build keycloak
```

Rollback tidak menghapus volume PostgreSQL. Jangan menjalankan `down -v`
karena command tersebut menghapus data database pada environment ini.

## Catatan keamanan

- Custom theme tidak mengubah OIDC flow, client secret, role, atau session.
- Secret tetap hanya berasal dari `.env.production`/secret provisioning.
- Nginx host tetap menangani TLS; theme tidak memerlukan port `80` atau `443`.
- Untuk production, gunakan Cloudflare `Full (strict)` ketika siap; status
  `Flexible` tetap merupakan security exception yang harus dicatat.

