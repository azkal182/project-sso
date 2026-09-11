# Pondok SSO — Client Integration Playbook

Panduan ini ditujukan untuk team aplikasi yang ingin menggunakan Pondok SSO
sebagai Identity Provider, baik untuk aplikasi baru maupun aplikasi yang sudah
memiliki authentication sendiri.

## Mulai dari sini

1. Baca [decision-tree.md](decision-tree.md).
2. Pilih pola integrasi sesuai jenis aplikasi.
3. Registrasikan application dan OAuth client mengikuti
   [client-registration.md](client-registration.md).
4. Implementasikan token validation mengikuti
   [token-and-authorization.md](token-and-authorization.md).
5. Jalankan [acceptance-checklist.md](acceptance-checklist.md).

## Panduan berdasarkan teknologi

- React SPA: [react-spa.md](react-spa.md)
- React dengan backend sendiri: [react-with-backend.md](react-with-backend.md)
- Next.js + NextAuth/Auth.js: [nextjs-nextauth.md](nextjs-nextauth.md)
- Laravel web application: [laravel-web.md](laravel-web.md)
- Laravel API: [laravel-api.md](laravel-api.md)
- Go server-rendered application: [go-server.md](go-server.md)
- Go API/resource server: [go-api.md](go-api.md)
- Existing authentication dan account linking: [existing-auth.md](existing-auth.md)

## Prinsip wajib

- Pondok SSO adalah OIDC/OAuth2 provider; client tidak membuat protokol sendiri.
- Client tidak boleh memanggil Keycloak Admin REST API secara langsung.
- Client tidak boleh menyimpan client secret di browser atau mobile app.
- JWT harus divalidasi signature, issuer, audience, expiry, dan not-before.
- Role dari client/application lain tidak boleh dipercaya.
- Access control harus ditegakkan lagi di backend/resource server.
- Email bukan identity key permanen; gunakan `sub` sebagai external identity key.
