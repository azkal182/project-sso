# Token dan Authorization Contract

## Validasi token wajib

Resource server harus memvalidasi:

1. Signature menggunakan JWKS dari discovery.
2. `iss` sama persis dengan issuer Pondok.
3. `aud` sesuai API/client yang dituju dan terdaftar pada application.
4. `exp`, `iat`, dan `nbf`.
5. `sub` tersedia.
6. `azp` sesuai OAuth client yang terdaftar pada application. `azp` dan `aud` boleh berbeda ketika web/mobile client meminta token untuk API client dalam application yang sama.

Gunakan hanya `access_token` untuk API. `id_token` tidak boleh diterima sebagai
bearer token meskipun signature dan issuer-nya valid. Batasi algorithm yang
diizinkan, validasi `kid`, dan gunakan JWKS cache yang dapat refresh saat
Keycloak melakukan key rotation.

Pseudo-code:

```text
configuration = discovery(issuer)
keys = configuration.jwks_uri
claims = verifyJwt(token, keys)
assert claims.iss == expectedIssuer
assert expectedAudience in claims.aud
assert claims.exp > now
```

## Role contract

Role application berada pada Keycloak client role:

```json
{
  "resource_access": {
    "attendance-production": {
      "roles": ["attendance.viewer"]
    }
  }
}
```

Hanya baca role dari client ID aplikasi sendiri.

## Permission resolution

Untuk mendapatkan permission hasil mapping role-permission, panggil:

```http
GET /api/applications/{applicationId}/authorization
Authorization: Bearer <access-token>
```

Contoh response:

```json
{
  "applicationId": "application-uuid",
  "clientId": "attendance-production",
  "subject": "keycloak-user-uuid",
  "roles": ["attendance.viewer"],
  "permissions": ["attendance.read"]
}
```

`401` berarti token tidak ada atau tidak valid. `403` berarti token valid tetapi
client, user, membership, atau authorization tidak sesuai. Gunakan response
yang konsisten dan jangan membocorkan data lintas application.

## Authorization cache dan perubahan akses

Authorization harus dievaluasi ulang ketika membership, role, permission, atau
status user berubah. Jika hasil authorization di-cache, gunakan TTL pendek,
key yang mencakup subject dan application/client, dan invalidasi saat menerima
event perubahan akses bila tersedia. Jangan menggunakan cache tanpa expiry untuk
resource sensitif.

## Negative cases

Uji minimal:

- token expired, malformed, signature salah, algorithm tidak diizinkan, atau
  issuer salah;
- `aud` atau `azp` berasal dari application lain;
- token tanpa `sub`, `iat`, `nbf`, `exp`, `aud`, atau `azp`;
- user disabled, membership revoked/disabled, role tidak di-assign, dan
  permission tidak ter-resolve;
- `id_token` dikirim ke endpoint API;
- JWKS berganti `kid` dan resource server tetap dapat memvalidasi token baru.

## Security rule

Jangan hanya mengecek role di frontend. Backend/resource server harus melakukan
validasi ulang pada setiap request yang membutuhkan authorization.
