# React dengan Backend Sendiri

## Recommended pattern: BFF

```text
React --> Application Backend --> Pondok SSO
React --> Application Backend --> Resource API
```

Backend aplikasi menangani authorization code, PKCE, token exchange, dan
session httpOnly. React tidak menerima client secret dan tidak perlu mengelola
refresh token secara langsung.

## Backend responsibilities

- Generate dan validasi `state`/`nonce`.
- Simpan PKCE verifier server-side.
- Tukar authorization code di server.
- Simpan session dengan cookie `HttpOnly`, `Secure`, dan `SameSite` sesuai
  deployment.
- Validasi access token sebelum memanggil resource API.
- Terapkan authorization server-side.
- Lindungi seluruh mutation berbasis cookie dengan CSRF token dan gunakan
  cookie `HttpOnly`, `Secure`, serta `SameSite` sesuai deployment.
- Pisahkan `id_token` untuk identitas dari `access_token` untuk pemanggilan API.
- Hapus session lokal jika refresh token gagal, user disabled, atau session
  Pondok berakhir.

## React responsibilities

- Redirect user ke route login backend.
- Memanggil endpoint aplikasi sendiri dengan cookie.
- Menampilkan state loading, unauthenticated, forbidden, dan error.
- Tidak membaca atau menyimpan client secret.
- Tidak menaruh token atau authorization code di log, URL, atau client-side
  analytics.

## Cocok untuk

- React + NestJS.
- React + Go.
- React + Laravel.
- React + backend BFF lainnya.
