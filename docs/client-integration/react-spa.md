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

## Best practice

- Utamakan BFF/httpOnly cookie jika architecture memungkinkan.
- Jangan simpan client secret di `.env` yang dipublish ke Vite bundle.
- Hindari menyimpan refresh token di `localStorage`.
- Gunakan memory storage atau secure BFF session.
- Tangani `401` dengan re-authentication dan `403` sebagai access denial.
- Batasi redirect URI dan web origin.

## Minimal configuration

```text
VITE_OIDC_ISSUER=https://sso.example.com/realms/pondok
VITE_OIDC_CLIENT_ID=attendance-production
VITE_API_URL=https://api.example.com
```

`VITE_*` values dianggap public. Jangan menaruh secret di dalamnya.
