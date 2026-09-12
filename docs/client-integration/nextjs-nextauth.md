# Next.js dengan NextAuth/Auth.js

## Recommended pattern

Gunakan NextAuth/Auth.js sebagai session/BFF layer dan Pondok SSO sebagai OIDC
provider:

```text
Browser --> NextAuth/Auth.js --> Pondok SSO
Browser --> Next.js server --> API
```

Jangan menjalankan session Pondok langsung di browser sekaligus session
NextAuth tanpa alasan yang jelas.

## Provider configuration concept

Gunakan discovery URL Pondok dan simpan secret hanya di server:

```text
OIDC_ISSUER=https://sso.example.com/realms/pondok
OIDC_CLIENT_ID=attendance-nextjs
OIDC_CLIENT_SECRET=from-secret-manager
NEXTAUTH_SECRET=from-secret-manager
```

Nama option dapat berbeda menurut versi Auth.js/NextAuth yang digunakan; ikuti
versi library di aplikasi, tetapi pertahankan issuer, client ID, secret,
callback, dan token validation contract dari dokumen ini.

## Callback responsibilities

- Simpan access token hanya pada server-side JWT/session strategy yang dipilih.
- Jangan mengirim client secret ke client component.
- Refresh token sebelum access token expired jika policy mengizinkan.
- Hapus session jika refresh gagal atau token invalid.
- API call server-side harus meneruskan bearer token yang benar.
- Bedakan `id_token` untuk identitas session dari `access_token` untuk resource
  API; jangan meneruskan `id_token` sebagai bearer token.
- Hapus session ketika refresh token gagal, user disabled, atau token tidak lagi
  valid.
- Lindungi mutation berbasis cookie dengan CSRF atau mekanisme anti-CSRF setara.

## Common mistake

Jangan menganggap session NextAuth otomatis menjadi authorization token untuk API.
API tetap harus menerima dan memvalidasi access token Pondok atau token internal
yang diterbitkan backend dengan kontrak yang jelas.

Uji juga callback error, state/nonce mismatch, logout lokal versus logout penuh,
rotasi JWKS, dan pemisahan client ID antar environment.
