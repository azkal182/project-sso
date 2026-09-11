# Laravel API

## Pattern

```text
Client --> Laravel API
              |
              +--> validate Pondok JWT/JWKS
```

Laravel API adalah resource server. Laravel tidak boleh hanya memeriksa bahwa
header bearer ada atau bahwa token dapat di-decode tanpa verifikasi signature.

## Middleware responsibilities

- Ambil bearer token.
- Ambil JWKS dari discovery/cache.
- Verifikasi signature dan algorithm yang diizinkan.
- Validasi issuer, audience, expiry, `nbf`, `sub`, dan `azp`.
- Cocokkan client ID dengan application yang diminta.
- Resolve role/permission.
- Return `401` untuk token invalid dan `403` untuk access denial.

## Recommended authorization

Untuk permission yang berasal dari mapping Pondok, panggil endpoint authorization
contract dari backend Laravel, bukan dari browser:

```http
GET https://admin.example.com/api/applications/{id}/authorization
Authorization: Bearer <access-token>
```

Cache authorization secara singkat hanya jika revocation policy mengizinkan.
Untuk data sensitif, lakukan resolution pada setiap request atau gunakan TTL
yang sangat pendek.
