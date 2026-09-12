# React SPA

## Pattern

```text
React browser --PKCE--> Pondok SSO
React browser --Bearer--> API
```

Gunakan public OAuth client. Client secret tidak boleh dibuat atau dikirim ke
browser.

## Flow

1. Generate `state`, `nonce`, dan PKCE `code_verifier`.
2. Redirect ke authorization endpoint dari discovery.
3. Terima callback dan validasi `state`.
4. Tukar code dengan token menggunakan `code_verifier`.
5. Panggil API dengan access token.
6. Logout dari local session dan Pondok SSO sesuai kebutuhan.

Gunakan `access_token` untuk API; jangan mengirim `id_token` sebagai bearer
token. Saat callback gagal karena state/nonce mismatch, jangan membuat session
dan mulai ulang flow secara aman.

## Best practice

- Utamakan BFF/httpOnly cookie jika architecture memungkinkan.
- Jangan simpan client secret di `.env` yang dipublish ke Vite bundle.
- Hindari menyimpan refresh token di `localStorage`.
- Gunakan memory storage atau secure BFF session.
- Tangani `401` dengan re-authentication dan `403` sebagai access denial.
- Batasi redirect URI dan web origin.
- Jangan menyimpan authorization code, access token, refresh token, atau
  verifier di log, analytics, URL setelah callback, atau error tracker.
- Jika SPA memakai BFF/cookie session, semua mutation wajib memakai CSRF
  protection; `SameSite` bukan pengganti CSRF token.

## Mobile/native note

Untuk aplikasi native gunakan system browser dan PKCE S256. Gunakan universal
link/app link jika tersedia; bila memakai custom scheme, pilih scheme yang
dikendalikan aplikasi dan validasi state/nonce. Simpan token hanya di secure OS
storage dan jangan menanamkan client secret.

## Minimal configuration

```text
VITE_OIDC_ISSUER=https://sso.example.com/realms/pondok
VITE_OIDC_CLIENT_ID=attendance-production
VITE_API_URL=https://api.example.com
```

`VITE_*` values dianggap public. Jangan menaruh secret di dalamnya.

Untuk pengujian lokal, callback HTTP pada `localhost`, `127.0.0.1`, atau `[::1]`
dengan port valid apa pun diperbolehkan. Gunakan client ID local terpisah dan
jangan memakai callback loopback pada client production yang digunakan publik.
