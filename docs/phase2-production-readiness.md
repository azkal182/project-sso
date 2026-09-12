# Phase 2 — Production Readiness untuk Single Instance

Dokumen ini menyimpan task plan P2 untuk deployment Pondok Identity Platform
pada satu VPS atau server. P2 berfokus pada deployment nyata, keamanan
operasional, backup/recovery, monitoring, dan kesiapan pilot client.

## Progress saat ini

Status berikut adalah progress deployment VPS dengan Nginx existing dan
Cloudflare. Checklist operasional yang belum diuji tetap dibiarkan pending.

### Sudah lulus

- [x] Docker Compose production tervalidasi.
- [x] Keycloak, dua PostgreSQL, Account Management, dan frontend berjalan.
- [x] Health check Keycloak, database, dan backend berhasil.
- [x] Nginx existing berhasil meneruskan `sso` dan `admin` ke Docker.
- [x] DNS Cloudflare, OIDC discovery, dan admin frontend berhasil diakses.
- [x] Port project memakai loopback high ports `18080`–`18082`.
- [x] Login, callback OIDC, dan pengujian frontend dinyatakan lulus.
- [x] Role `platform-admin` pada realm `pondok` berhasil digunakan.
- [x] Metrics dan `X-Request-ID` tersedia.

### Masih pending

- [ ] Backup dan restore kedua database.
- [ ] Restart dan persistence test.
- [ ] Firewall dan audit network exposure.
- [ ] Monitoring, alerting, dan log retention.
- [ ] Reconciliation PostgreSQL ↔ Keycloak.
- [ ] Rollback image dan migration.
- [ ] Final production readiness gate.

### Accepted risk sementara

- [ ] Cloudflare masih menggunakan `Flexible`, sehingga koneksi Cloudflare ke
  origin VPS belum terenkripsi. Risiko, mitigasi firewall, owner, expiry, dan
  rencana migrasi ke `Full (strict)` harus dicatat sebelum production sign-off.

Phase 2 belum dinyatakan selesai sampai seluruh item pending memiliki evidence
atau secara eksplisit disetujui sebagai accepted risk oleh owner deployment.

## Scope dan asumsi

- Deployment menggunakan satu VPS/server.
- Docker Compose production digunakan sebagai orchestrator.
- Tidak ada horizontal scaling pada tahap ini.
- Tidak ada Redis atau distributed session/rate limiter pada tahap ini.
- Downtime singkat saat deployment dapat diterima melalui maintenance window.
- Backup database wajib disimpan di luar VPS.
- Jika Nginx sudah tersedia di VPS, gunakan host Nginx dan
  `docker-compose.vps.yml`; jangan mengambil alih port `80/443` dengan proxy
  container project.

## Arsitektur target

```text
Internet
   |
   v
Nginx reverse proxy + TLS
   |
   +--> React frontend
   +--> NestJS Account Management
   +--> Keycloak OIDC

PostgreSQL Keycloak
PostgreSQL Account Management
```

## P2.1 — VPS dan deployment

### Task

- [ ] Pilih VPS/server dan domain production.
- [ ] Siapkan DNS untuk domain SSO dan admin.
- [ ] Siapkan Docker Engine dan Docker Compose.
- [ ] Siapkan directory deployment dengan permission terbatas.
- [ ] Siapkan `deploy/tls/` dari certificate manager.
- [ ] Salin `.env.production.example` menjadi `.env.production`.
- [ ] Isi seluruh secret melalui secret manager atau secure provisioning.
- [ ] Validasi production Compose.
- [ ] Jalankan stack production.
- [ ] Verifikasi seluruh container healthy.

### Command baseline

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml config --quiet

PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml up -d

docker compose --env-file .env.production \
  -f docker-compose.prod.yml ps
```

Untuk VPS yang sudah memiliki Nginx pada host, gunakan override berikut agar
proxy bawaan tidak mengambil port `80/443`:

```bash
PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  config --quiet

PRODUCTION_ENV_FILE=.env.production \
docker compose --env-file .env.production \
  -f docker-compose.prod.yml \
  -f docker-compose.vps.yml \
  up -d --build
```

Konfigurasi Nginx host dan Cloudflare tersedia di
[`docs/external-nginx-cloudflare.md`](external-nginx-cloudflare.md).

### Acceptance criteria

- [ ] Discovery Keycloak production dapat diakses melalui HTTPS.
- [ ] Frontend admin dapat diakses melalui HTTPS.
- [ ] Backend `/health` mengembalikan `{"status":"UP"}`.
- [ ] Bootstrap admin tidak digunakan sebagai runtime credential.
- [ ] Port database, management, dan backend internal tidak public.
- [ ] Jika memakai Nginx existing, service project hanya bind ke loopback
  high ports dan tidak konflik dengan aplikasi lain.

## P2.2 — Secret dan configuration management

### Task

- [ ] Simpan `SESSION_SECRET` di secret manager.
- [ ] Simpan `MANAGEMENT_CLIENT_SECRET` di secret manager.
- [ ] Simpan `ACCOUNT_MANAGEMENT_CLIENT_SECRET` di secret manager.
- [ ] Simpan password PostgreSQL di secret manager.
- [ ] Simpan bootstrap admin sebagai credential provisioning-only.
- [ ] Pastikan `.env.production` tidak masuk Git.
- [ ] Rotasi semua secret setelah provisioning awal.
- [ ] Catat tanggal dan prosedur rotasi.
- [ ] Verifikasi startup gagal jika secret wajib hilang/placeholder.

### Acceptance criteria

- [ ] Tidak ada secret pada source code, image, browser bundle, atau log.
- [ ] `SESSION_SECRET` production minimal 32 karakter.
- [ ] Production hanya memakai URL HTTPS.
- [ ] Rotasi secret tidak memerlukan perubahan source code.

## P2.3 — TLS, firewall, dan network exposure

- [ ] Pasang certificate dan private key melalui certificate manager.
- [ ] Redirect HTTP ke HTTPS.
- [ ] Pastikan secure cookie aktif.
- [ ] Batasi firewall ke port 80/443 dan SSH administrator.
- [ ] Gunakan Cloudflare `Full (strict)` dan origin certificate/sertifikat valid.
- [ ] Konfigurasikan Nginx host dengan `Host`, `X-Forwarded-Proto`, dan
  `X-Forwarded-For` yang benar.
- [ ] Percayai `CF-Connecting-IP` hanya dari range IP Cloudflare resmi.
- [ ] Jangan expose PostgreSQL ke public internet.
- [ ] Jangan expose Keycloak port `9000` ke public internet.
- [ ] Batasi Keycloak Admin Console ke private network.
- [ ] Batasi `/metrics` ke jaringan monitoring.

### Acceptance criteria

- [ ] TLS certificate valid dan hostname sesuai.
- [ ] Certificate expiry dipantau.
- [ ] Port internet hanya yang diperlukan.
- [ ] Port project hanya listen pada `127.0.0.1` atau jaringan private.
- [ ] Deployment tidak mengganggu aplikasi lain yang sudah berjalan di VPS.
- [ ] Request HTTP diarahkan ke HTTPS.
- [ ] Cookie session memiliki `HttpOnly` dan `Secure`.

## P2.4 — Database backup dan restore

### Task

- [ ] Jadwalkan backup PostgreSQL Keycloak.
- [ ] Jadwalkan backup PostgreSQL Account Management.
- [ ] Gunakan format custom PostgreSQL.
- [ ] Enkripsi backup.
- [ ] Simpan backup di luar VPS.
- [ ] Terapkan retention policy.
- [ ] Jalankan restore drill ke environment terisolasi.
- [ ] Jalankan smoke test setelah restore.
- [ ] Jalankan reconciliation PostgreSQL ↔ Keycloak setelah restore.

### Command terkait

```bash
BACKUP_DIR=/secure/backup/location \
PRODUCTION_ENV_FILE=.env.production \
bash ops/backup.sh

DATABASE_URL='postgresql://...' \
KEYCLOAK_URL='https://sso.example.com' \
MANAGEMENT_CLIENT_SECRET='from-secret-manager' \
bash ops/reconcile.sh
```

### Acceptance criteria

- [ ] Backup kedua database berhasil.
- [ ] Backup dapat diambil dari luar VPS.
- [ ] Restore berhasil pada database terisolasi.
- [ ] User, application, OAuth mapping, role, dan permission konsisten.
- [ ] RPO dan RTO dicatat.

Target awal pilot: RPO maksimal 24 jam dan RTO maksimal 4 jam.

## P2.5 — Monitoring dan alerting

- [ ] Pantau frontend dari jaringan eksternal.
- [ ] Pantau backend `/health`.
- [ ] Pantau Keycloak discovery endpoint.
- [ ] Pantau TLS certificate expiry.
- [ ] Pantau CPU, memory, disk, dan inode VPS.
- [ ] Pantau PostgreSQL container dan connection errors.
- [ ] Scrape backend `/metrics` dari jaringan internal.
- [ ] Terapkan log retention dan rotation.
- [ ] Buat alert untuk service unhealthy.
- [ ] Buat alert untuk disk hampir penuh.
- [ ] Buat alert certificate mendekati expiry.

### Acceptance criteria

- [ ] Alert diterima ketika backend dihentikan.
- [ ] Alert diterima ketika Keycloak tidak ready.
- [ ] Alert diterima ketika disk melewati threshold.
- [ ] Request dapat ditelusuri dengan `X-Request-ID`.
- [ ] Log tidak mengandung token, cookie, password, atau secret.

## P2.6 — Reliability dan failure testing

| Skenario | Expected result |
|---|---|
| Restart frontend | Frontend kembali healthy |
| Restart backend | Backend kembali healthy dan session tersimpan |
| Restart Keycloak | Health terdegradasi lalu pulih |
| PostgreSQL unavailable | Health tidak mengklaim `UP` |
| Keycloak unavailable | Timeout dan error terkontrol |
| Invalid secret | Container gagal startup dengan jelas |
| Migration startup bersamaan | Hanya satu migration runner aktif |
| Rollback deployment | Image versi sebelumnya dapat dijalankan |

### Acceptance criteria

- [ ] Tidak ada infinite retry loop.
- [ ] Error tidak membocorkan secret atau stack trace internal.
- [ ] Recovery tidak membutuhkan setup manual melalui UI.
- [ ] Rollback dapat dilakukan berdasarkan runbook.

## P2.7 — Security verification

- [ ] Jalankan dependency vulnerability audit.
- [ ] Verifikasi CSRF protection.
- [ ] Verifikasi rate limit login dan API.
- [ ] Verifikasi token issuer dan audience.
- [ ] Verifikasi expired token ditolak.
- [ ] Verifikasi revoked membership menghasilkan `403`.
- [ ] Verifikasi disabled user tidak dapat login/akses API.
- [ ] Verifikasi delegated admin tidak dapat mengakses application lain.
- [ ] Verifikasi frontend tidak memanggil Admin REST API langsung.
- [ ] Verifikasi production source map tidak membocorkan secret.

### Acceptance criteria

- [ ] Tidak ada critical/high vulnerability tanpa mitigation.
- [ ] Privilege escalation test gagal sesuai harapan.
- [ ] Token client lain ditolak.
- [ ] Destructive operation memiliki confirmation dan authorization.

## P2.8 — Client pilot acceptance

- [ ] Register satu client application.
- [ ] Uji Authorization Code + PKCE.
- [ ] Uji exact redirect URI.
- [ ] Uji logout dan post-logout redirect.
- [ ] Uji signature, issuer, audience, expiry, dan `nbf` token.
- [ ] Uji application role dan resolved permission.
- [ ] Uji disabled user dan revoked membership.
- [ ] Uji OAuth secret rotation untuk confidential client.
- [ ] Uji invalid redirect URI ditolak.
- [ ] Dokumentasikan onboarding client.

### Acceptance criteria

- [ ] Client tidak menyimpan password sendiri.
- [ ] Client hanya menerima authorization application-nya.
- [ ] Revoked access tidak lagi menghasilkan authorization.
- [ ] Logout mengakhiri session lokal dan Keycloak.
- [ ] Client checklist disetujui sebelum pilot.

## P2.9 — Release, rollback, dan incident runbook

- [ ] Tag image production dengan version immutable.
- [ ] Backup database sebelum deployment.
- [ ] Catat image version yang berjalan.
- [ ] Deploy melalui maintenance window.
- [ ] Jalankan smoke test pascadeploy.
- [ ] Siapkan rollback image.
- [ ] Siapkan rollback database/migration procedure.
- [ ] Dokumentasikan incident escalation dan on-call.
- [ ] Dokumentasikan secret rotation.
- [ ] Dokumentasikan Keycloak upgrade.

### Acceptance criteria

- [ ] Deployment dapat diulang operator lain berdasarkan runbook.
- [ ] Rollback dapat dilakukan tanpa menebak command.
- [ ] Smoke test pascadeploy lulus.
- [ ] Incident owner dan escalation path jelas.

## Verification checklist final

```bash
bash tests/staging_config_smoke.sh
bash tests/phase2_smoke.sh
bash tests/phase3_smoke.sh
bash tests/p1_security_smoke.sh
bash tests/p1_authorization_contract_smoke.sh
bash tests/p1_observability_smoke.sh

cd frontend
E2E_USERNAME='pilot-admin' \
E2E_PASSWORD='from-secret-manager' \
bun run e2e:pilot
```

P2 dinyatakan selesai hanya jika acceptance criteria terpenuhi, backup/restore
drill berhasil, deployment staging nyata berhasil, dan client pilot selesai
acceptance checklist.

## Di luar scope P2 single-instance

- Redis distributed session.
- Distributed rate limiter.
- Horizontal scaling.
- Load balancer.
- High availability/failover cluster.
- Multi-instance consistency testing.

Item tersebut menjadi pekerjaan terpisah jika arsitektur berubah menjadi
multi-instance.
