# Pondok Identity Platform

Repository ini mencakup infrastructure, Keycloak bootstrap, Account Management
berbasis NestJS + Drizzle, serta frontend React + Vite untuk admin portal.
Detail frontend tersedia di [docs/frontend.md](docs/frontend.md). Workflow
Docker watch mode dan migrasi Bun dijelaskan di [docs/development.md](docs/development.md).
Kontrak integrasi aplikasi client tersedia di [docs/client-integration.md](docs/client-integration.md).

## Arsitektur

- `postgres:16.4-alpine` menyimpan database Keycloak.
- `quay.io/keycloak/keycloak:26.0.7` adalah OIDC/OAuth2 provider yang dipin ke versi exact.
- Keycloak dijalankan dengan `start`, bukan `start-dev`, dan tidak memakai embedded database.
- `keycloak-bootstrap` adalah job idempotent yang menggunakan bootstrap admin hanya untuk provisioning awal.
- Aplikasi runtime nantinya wajib memakai client credentials dari `account-management-service`.

Realm dan client dikonfigurasi lewat `infra/keycloak/realm.json` dan `infra/keycloak/bootstrap.sh`, sehingga tidak perlu setup manual melalui Admin Console.

## Menjalankan development environment

```bash
cp .env.example .env
# Ganti seluruh nilai placeholder di .env
docker compose up -d
docker compose ps
docker compose logs --no-log-prefix keycloak-bootstrap
```

Endpoint penting:

- OIDC discovery: http://localhost:8080/realms/pondok/.well-known/openid-configuration
- JWKS: http://localhost:8080/realms/pondok/protocol/openid-connect/certs
- Readiness: http://localhost:9000/health/ready
- Metrics: http://localhost:9000/metrics
- Admin Console: http://localhost:8080/admin/

Run smoke test setelah bootstrap selesai:

```bash
set -a; source .env; set +a
bash tests/phase2_smoke.sh
bash tests/phase3_smoke.sh
```

Bootstrap bersifat aman untuk dijalankan ulang. Untuk mengulang dari database kosong, hentikan environment dan hapus volume project secara eksplisit setelah memastikan data boleh dihapus:

```bash
docker compose down -v
```

## Keycloak configuration

Realm `pondok` dibuat enabled dengan password reset dan remember-me aktif. Pada development SSL realm `NONE`; pada production bootstrap menetapkan `EXTERNAL` sehingga browser/client harus menggunakan HTTPS.

- `account-management`: confidential OIDC client untuk web application, standard authorization code flow aktif, redirect development ke `http://localhost:3000/*`.
- `account-management-service`: confidential client tanpa browser flow, service account aktif, dipakai untuk Admin REST API dengan client credentials.

Service account menerima client roles dari built-in `realm-management` client: `manage-users`, `view-users`, `query-users`, `manage-clients`, `view-clients`, dan `query-clients`. Scope ini cukup untuk provisioning user/client dan sinkronisasi role pada tahap berikutnya; tidak memberikan `realm-admin`.

Bootstrap admin (`KEYCLOAK_ADMIN` dan `KEYCLOAK_ADMIN_PASSWORD`) hanya digunakan job provisioning. Credential runtime harus berasal dari `MANAGEMENT_CLIENT_SECRET` dan tidak boleh disamakan dengan bootstrap admin.

## Frontend — React + Vite

Frontend terpisah berada di `frontend/` dan menggunakan fondasi UI dari
[shadcn-admin](https://github.com/satnaing/shadcn-admin). Authentication tetap
ditangani backend melalui Keycloak OIDC; frontend tidak menyimpan password atau
access token.

Jalankan seluruh development stack dari root:

```bash
docker compose --env-file .env.example up -d --build
```

Compose menjalankan NestJS dan Vite dalam mode watch; perubahan source tidak
memerlukan rebuild image.

Buka http://localhost:5173. Dokumentasi route, proxy, build, dan kontrak API
ada di [docs/frontend.md](docs/frontend.md).

## Phase 3 — Account Management

Account Management tersedia sebagai web application NestJS + TypeScript pada `account-management/`, dengan Drizzle ORM dan PostgreSQL terpisah. Aplikasi ini:

- melakukan login melalui OIDC client `account-management`;
- menyimpan session server-side di PostgreSQL;
- hanya menyimpan `keycloak_user_id` dan profil lokal, tanpa password;
- menyediakan route UI `/sign-in`, `/dashboard`, `/users`, `/applications`, detail application, dan `/audit` beserta route domain terkait;
- menyediakan API awal untuk users, applications, roles, dan audit;
- menyediakan CRUD users, applications, memberships, roles, permissions, OAuth-client mapping, dan assignment terkait;
- memakai `account-management-service` untuk Keycloak Admin REST API;
- menerapkan authorization server-side berdasarkan role `platform-admin` dan tabel `application_admins`;
- membuat/sinkronisasi application roles sebagai Keycloak client roles.
- menjalankan assignment lintas domain dalam transaksi Drizzle;
- menggunakan Bun dan `bun.lock` pada development maupun image build.

Application structure utama:

- `src/auth`: OIDC authorization-code flow, session guard, dan platform-admin guard;
- `src/db/schema.ts`: Drizzle schema untuk domain Account Management;
- `src/db/database.ts`: Drizzle PostgreSQL connection dan migration execution;
- `src/keycloak`: service-account client untuk Keycloak Admin REST API;
- `src/users`, `src/applications`, `src/audit`: NestJS controllers/domain endpoints.

Schema berada di `account-management/migrations/001_initial.sql` dan mencakup users, applications, OAuth clients, memberships, roles, permissions, role-permission mapping, membership-role assignment, application admins, dan audit logs. Assignment role/permission dan membership/role memvalidasi bahwa semua entitas berada pada application yang sama.

Jalankan Phase 3 dengan:

```bash
docker compose --env-file .env.example up -d --build
curl http://localhost:3000/health
```

Login browser tersedia di frontend http://localhost:5173/sign-in. Untuk memaksa pemilihan user Keycloak baru gunakan http://localhost:5173/auth/login?fresh=1. Endpoint health backend tersedia di http://localhost:3000/health.

## Phase 4 — User Management

User administration tersedia melalui `/api/users` dan UI `/users` untuk:

- list/search user dari Keycloak dengan local mapping status;
- create user dan menyimpan referensi lokal di PostgreSQL;
- view dan update profile;
- enable/disable user;
- set atau reset password dengan opsi temporary password;
- delete user;
- audit event `user.created`, `user.updated`, `user.enabled`, `user.disabled`, `user.password_reset_initiated`, dan `user.deleted`.

Operasi create lintas Keycloak dan PostgreSQL menggunakan compensation: bila penulisan local reference atau password gagal setelah user Keycloak dibuat, service mencoba menghapus user Keycloak tersebut. Karena database tidak dapat mencakup REST API Keycloak dalam satu transaksi, kegagalan compensation harus dipantau melalui log dan direkonsiliasi oleh administrator.

Endpoint user management hanya dapat diakses oleh session OIDC dengan role `platform-admin` dan seluruh perubahan Keycloak menggunakan `account-management-service` service account.

## Phase 5 — Application/OAuth Client Management

Application management menyediakan CRUD aplikasi dan OAuth client tanpa perubahan source code atau akses normal ke Keycloak Admin Console. OAuth client mendukung tipe `web`, `api`, `mobile`, dan `service`, serta menyimpan `enabled`, `redirectUris`, dan `webOrigins` pada PostgreSQL. Client Keycloak dibuat dan diperbarui melalui Admin REST API.

Endpoint penting:

- `POST/PATCH/DELETE /api/applications`
- `POST/GET/PATCH/DELETE /api/applications/:applicationId/oauth-clients`
- `POST /api/applications/:applicationId/oauth-clients/:clientId/rotate-secret`

Secret tidak disimpan di database dan hanya dikembalikan sekali dari endpoint rotation. Operasi pembuatan OAuth client menggunakan compensation: jika mapping PostgreSQL gagal, client Keycloak dihapus kembali.

## Phase 6 & 7 — Authorization and Delegated Administration

Membership, role, permission, role-permission mapping, dan membership-role assignment dibatasi dengan `application_id`. Role application disinkronkan ke client Keycloak yang terhubung. Application administrator dikelola platform administrator melalui `/api/applications/:id/admins`; administrator tersebut dapat mengelola membership, role, permission, assignment, dan OAuth client hanya pada application yang ditugaskan.

Semua endpoint scoped memanggil authorization server-side. Akses ke application lain menghasilkan `403`, dan assignment role/permission lintas application menghasilkan `400`. Update/delete application, audit global, user global, dan pengelolaan delegated admin tetap hanya untuk `platform-admin`.

## Production structure

`docker-compose.prod.yml` menyediakan struktur produksi yang sama dengan:

- Keycloak `start` production mode dan PostgreSQL terpisah;
- Nginx reverse proxy pinned dengan TLS untuk `sso.example.com` dan `admin.example.com`;
- Keycloak, Account Management, PostgreSQL, dan port management `9000` tidak dipublish langsung;
- hostname strict, forwarded HTTPS headers, secure session cookie, dan health checks;
- metrics tetap aktif pada management port 9000 yang hanya dapat diakses jaringan observability.

Salin `.env.production.example` menjadi `.env.production`, isi dari secret manager, siapkan TLS files pada `deploy/tls/`, lalu jalankan dengan env file tersebut:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

Untuk prosedur lengkap deployment, backup/restore, reconciliation, upgrade, dan rotasi secret, lihat [docs/production-operations.md](docs/production-operations.md). Rotasi bootstrap admin setelah provisioning dan jangan gunakan credential tersebut sebagai runtime credential.

## Verification

Smoke test memeriksa readiness, OIDC discovery, JWKS, metrics, client-credentials token, dan akses Admin REST API menggunakan service account. P1 checks juga memverifikasi rate limiting, CSRF, request correlation, authorization contract, revoked membership, staging Compose, dan authenticated PKCE E2E.

```bash
bash tests/staging_config_smoke.sh
bash tests/p1_observability_smoke.sh
bash tests/p1_authorization_contract_smoke.sh
bash tests/phase3_smoke.sh
bash tests/p1_security_smoke.sh
```

Authenticated pilot flow:

```bash
cd frontend
E2E_USERNAME=pilot-admin \
E2E_PASSWORD='development-secret' \
bun run e2e:pilot
```

Tidak ada mock Keycloak dan tidak ada password storage Account Management.
Kontrak resolusi authorization untuk client tersedia pada
`GET /api/applications/:id/authorization`; detailnya ada di
[docs/client-integration.md](docs/client-integration.md).
