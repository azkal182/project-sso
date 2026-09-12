# Go Server-rendered Application

## Pattern

```text
Browser --> Go application --> Pondok SSO
Browser --> Go secure session
```

Gunakan Authorization Code + PKCE. Simpan verifier dan state pada server-side
session atau short-lived signed transaction.

## Implementation responsibilities

- Ambil discovery document.
- Redirect ke authorization endpoint.
- Validasi callback state dan nonce.
- Tukar code pada token endpoint.
- Validasi ID token dengan JWKS.
- Map `sub` ke user lokal.
- Buat secure cookie session.
- Terapkan middleware role/permission.
- Lindungi mutation berbasis cookie dengan CSRF token atau mekanisme anti-CSRF
  setara.
- Bedakan `id_token` untuk identitas dari `access_token` untuk API.

Gunakan library OIDC/OAuth2 Go yang mendukung discovery dan JWKS caching.
Jangan menyalin implementasi JWT verification manual ke production.

## Cookie baseline

- `HttpOnly=true`
- `Secure=true` pada HTTPS
- `SameSite=Lax` atau policy yang disetujui
- expiry terbatas
- session invalidation pada logout

Uji logout lokal dan logout penuh, callback error, session expiry, state/nonce
mismatch, serta jangan mencatat code, token, verifier, atau secret ke log.
