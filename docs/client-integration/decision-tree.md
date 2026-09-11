# Decision Tree Integrasi

## 1. Apakah aplikasi sudah memiliki authentication?

### Tidak

Pilih berdasarkan arsitektur:

- React SPA yang memanggil API langsung → [react-spa.md](react-spa.md)
- React dengan backend sendiri → [react-with-backend.md](react-with-backend.md)
- Next.js + NextAuth/Auth.js → [nextjs-nextauth.md](nextjs-nextauth.md)
- Laravel server-rendered → [laravel-web.md](laravel-web.md)
- Laravel API → [laravel-api.md](laravel-api.md)
- Go server-rendered → [go-server.md](go-server.md)
- Go API → [go-api.md](go-api.md)

### Ya

Baca [existing-auth.md](existing-auth.md) terlebih dahulu. Tentukan apakah:

1. Pondok menjadi authentication utama; atau
2. authentication lama tetap aktif dan Pondok menjadi identity tambahan.

Jangan menggabungkan dua session system tanpa aturan account linking, logout,
dan token ownership yang jelas.

## 2. Apakah ada browser/mobile public client?

- Ya → gunakan Authorization Code + PKCE S256 dan public client.
- Tidak, server menyimpan secret → gunakan confidential client.
- Service-to-service tanpa user → gunakan client credentials.

## 3. Apakah API berada di backend yang sama?

- Ya → gunakan server-side session atau BFF.
- Tidak → API harus menjadi resource server dan memvalidasi bearer token sendiri.

## Rekomendasi default

- Next.js: NextAuth/Auth.js sebagai BFF/session layer.
- Laravel web: server-side session Laravel.
- Go web: server-side session Go.
- React SPA: BFF jika tersedia; direct token hanya bila memang diperlukan.
- API: validasi JWT lokal dengan JWKS, bukan introspection pada setiap request.
