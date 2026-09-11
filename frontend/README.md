# Pondok Admin Frontend

Frontend admin portal untuk Pondok Identity Platform. Aplikasi ini menggunakan
React, Vite, TanStack Router, TanStack Query, Tailwind CSS, dan komponen
shadcn/ui. Autentikasi dilakukan melalui backend session yang terintegrasi
dengan Keycloak.

## Menjalankan

Gunakan Bun 1.3.14:

```bash
bun install
bun run dev
```

Atau jalankan seluruh development environment melalui Docker Compose dari root
repository:

```bash
docker compose up --build
```

Frontend tersedia di `http://localhost:5173` dan meneruskan request `/api`
ke backend di `http://localhost:3000`.

## Verifikasi

```bash
bun run build
bun run lint
```

## Area aplikasi

- `/` — dashboard ringkasan
- `/applications` — daftar dan CRUD application
- `/applications/:applicationId` — detail dan management application: OAuth clients, members, roles, permissions, assignments, dan delegated admins
- `/users` — daftar dan CRUD user
- `/settings/account` — pengaturan akun

Detail arsitektur, environment variable, Docker, dan production deployment
tersedia di `../docs/development.md` dan `../README.md`.
