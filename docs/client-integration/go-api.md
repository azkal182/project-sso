# Go API / Resource Server

## Pattern

```text
Client --> Go API --validate--> Pondok JWKS
```

Go API memvalidasi access token secara lokal dengan JWKS cache.

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
