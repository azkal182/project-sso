# Laravel Web Application

## Pattern

```text
Browser --> Laravel --> Pondok SSO
Browser --> Laravel session
```

Laravel menggunakan Authorization Code + PKCE dan membuat session aplikasi
server-side.

## Implementation steps

1. Ambil discovery document issuer Pondok.
2. Buat route `/login/pondok` untuk redirect.
3. Buat callback route `/auth/pondok/callback`.
4. Simpan `state`, `nonce`, dan PKCE verifier pada session sementara.
5. Tukar code di server Laravel.
6. Validasi ID token dan claims.
7. Cari atau link user berdasarkan `sub`.
8. Buat session Laravel.
9. Terapkan middleware authorization.

Gunakan OAuth2/OIDC client library yang mendukung PKCE, discovery, JWKS, dan
validasi issuer. Jangan mengimplementasikan JWT verification sendiri.

## Environment concept

```text
PONDOK_ISSUER=https://sso.example.com/realms/pondok
PONDOK_CLIENT_ID=attendance-laravel
PONDOK_CLIENT_SECRET=from-secret-manager
PONDOK_REDIRECT_URI=https://attendance.example.com/auth/pondok/callback
```

Konfigurasi aktual bergantung pada package OAuth/OIDC Laravel yang disetujui
team. Secret hanya berada di server/secret manager.

## Logout

Logout minimal harus menghapus session Laravel. Jika membutuhkan single logout,
redirect ke end-session endpoint Pondok dengan `post_logout_redirect_uri` yang
telah terdaftar.
