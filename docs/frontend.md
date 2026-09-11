# Frontend — Pondok Admin

Frontend Pondok dipisahkan sebagai aplikasi React + Vite pada directory
`frontend/`. UI menggunakan template [shadcn-admin](https://github.com/satnaing/shadcn-admin)
dengan komponen shadcn/ui, Tailwind CSS, TanStack Router, dan TanStack Query.
Template digunakan sebagai fondasi UI dan dikustomisasi untuk OIDC Keycloak;
frontend tidak menggunakan Clerk atau mock authentication.

## Menjalankan development

Pastikan backend Account Management berjalan pada `http://localhost:3000`, lalu:

```bash
docker compose --env-file .env.example up -d
```

Untuk menjalankan frontend di luar Compose:

```bash
cd frontend
bun install --frozen-lockfile
bun run dev
```

Buka [http://localhost:5173](http://localhost:5173). Vite mem-proxy `/api`,
`/auth`, dan `/health` ke backend pada port 3000. Variabel `VITE_API_BASE_URL`
boleh dikosongkan untuk development dengan proxy; pada deployment yang memakai
host berbeda, isi dengan base URL backend yang sesuai.

## Alur authentication

- Route yang berada di `/_authenticated` memanggil `GET /api/me` sebelum render.
- User yang belum memiliki session diarahkan ke `/auth/login?fresh=1`.
- Login dan logout diselesaikan oleh backend melalui Keycloak OIDC.
- Session cookie dikelola backend; frontend tidak menyimpan access token di
  localStorage.
- Callback backend mengembalikan browser ke `FRONTEND_URL/dashboard`.

## Route yang tersedia

- `/sign-in` — entry point login Keycloak.
- `/dashboard` — ringkasan user, application, dan status platform.
- `/users` — directory user dari Account Management API.
- `/applications` — daftar dan CRUD application dari Account Management API.
- `/applications/:id` — detail dan management application: OAuth clients,
  members, roles, permissions, role/permission assignments, dan delegated admins.
- route template lain tetap tersedia sebagai shell UI, tetapi hanya route yang
  terhubung ke API Pondok yang dianggap production-ready.

## Build dan production container

```bash
bun run build
```

`frontend/Dockerfile` membangun asset menggunakan Bun dan menyajikannya
dengan Nginx. `frontend/nginx.conf` melakukan SPA fallback ke `index.html` dan
mem-proxy `/api`, `/auth`, serta `/health` ke service `account-management`.
Production compose menempatkan frontend di belakang reverse proxy utama pada
host admin.

## Kontrak API yang dipakai UI

- `GET /api/me`
- `GET /api/users`
- `GET/POST /api/applications`
- `PATCH/DELETE /api/applications/:id`
- `GET /api/applications/:id/user-directory`
- `GET/POST/DELETE /api/applications/:id/{roles,permissions}`
- `GET/POST/PATCH/DELETE /api/applications/:id/members`
- `POST/DELETE /api/applications/:id/members/:membershipId/roles`
- `GET/POST/PATCH/DELETE /api/applications/:id/oauth-clients`
- `POST /api/applications/:id/oauth-clients/:clientId/rotate-secret`
- `GET /api/applications/:id/authorization` (Bearer access token contract)
- `GET/POST/DELETE /api/applications/:id/admins` (platform admin only)
- `GET/POST/PATCH/DELETE /api/users`
- `GET /auth/csrf`; seluruh mutasi browser mengirim header `x-csrf-token`
- `GET /auth/login?fresh=1`
- `GET /auth/logout`

Operasi mutasi domain tetap dilindungi authorization server-side backend.
UI sudah menyediakan form create/edit, enable/disable, delete, server-side
search, loading/error state, toast feedback, invalidasi cache setelah mutation,
dan menampilkan secret OAuth hanya sekali setelah rotasi.

## Verifikasi

```bash
bun run build
bun run lint
```

Untuk smoke test end-to-end, jalankan stack development dari root repository,
bootstrap Keycloak, lalu buka frontend dan uji login, dashboard, users,
applications, dan logout menggunakan user Keycloak yang sudah memiliki role
yang sesuai.

Kontrak integrasi OIDC dan role untuk aplikasi client tersedia di
[docs/client-integration.md](client-integration.md).

Authenticated browser pilot test membutuhkan environment yang sudah berjalan
dan credential yang tidak disimpan di repository:

```bash
E2E_USERNAME=platform-admin \
E2E_PASSWORD='use-secret-manager-value' \
bun run e2e:pilot
```
