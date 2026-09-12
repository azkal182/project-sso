# Go API / Resource Server

## Pattern

```text
Client --> Go API --validate--> Pondok JWKS
```

Go API memvalidasi access token secara lokal dengan JWKS cache.

Go API hanya menerima `access_token`, bukan `id_token`. JWKS cache harus dapat
refresh ketika `kid` baru muncul dan JWT algorithm harus dibatasi sesuai policy.

## Middleware checklist

```text
Authorization: Bearer <token>
        |
        +--> parse token
        +--> verify signature
        +--> verify issuer
        +--> verify audience
        +--> verify exp/nbf
        +--> verify azp/client
        +--> resolve role/permission
        +--> handler
```

Return:

- `401 Unauthorized`: token missing, malformed, expired, wrong issuer, atau
  wrong signature.
- `403 Forbidden`: token valid tetapi role, membership, atau permission tidak
  mencukupi.

Gunakan context untuk membawa subject dan authorization result ke handler.
Jangan log raw access token.

Untuk Client Credentials, tidak ada user session. Gunakan scope/permission
service yang paling sempit, validasi audience dan `azp`, serta rotasi credential
di luar source code. Jangan mengasumsikan `sub` selalu mewakili user pada token
service.
