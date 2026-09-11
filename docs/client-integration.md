# Pondok Client Integration Contract

Untuk panduan implementasi per teknologi dan berbagai skenario autentikasi,
lihat [Client Integration Playbook](client-integration/README.md).

Dokumen ini adalah kontrak minimum untuk aplikasi client yang memakai Pondok
Identity Platform.

## OIDC endpoints

Issuer:

```text
https://sso.example.com/realms/pondok
```

Discovery wajib diambil dari:

```text
https://sso.example.com/realms/pondok/.well-known/openid-configuration
```

Client tidak boleh meng-hardcode endpoint token, JWKS, atau logout. Gunakan
discovery document dan validasi `issuer` terhadap issuer realm tersebut.

## Client type

- Web server: confidential client, Authorization Code + PKCE.
- SPA: public client, Authorization Code + PKCE S256.
- Mobile: public client, Authorization Code + PKCE S256 dengan redirect URI
  platform yang spesifik.
- Service-to-service: confidential client dengan client credentials. Client
  secret tidak boleh dikirim ke browser atau mobile application.

Direct Access Grants dan password grant tidak digunakan.

## Token validation

Client wajib memvalidasi:

- signature menggunakan JWKS Keycloak;
- `iss` sama dengan issuer Pondok;
- `aud` sesuai client/service yang dituju;
- `exp`, `iat`, dan `nbf`;
- token type sesuai kebutuhan API.

Jangan menerima token hanya karena signature valid tanpa memeriksa issuer dan
audience.

## Role contract

Role application disinkronkan sebagai Keycloak client role pada setiap OAuth
client yang terhubung dengan application. Untuk access token yang diterbitkan
untuk client tersebut, role tersedia pada:

```json
{
  "resource_access": {
    "client-id": {
      "roles": ["manager", "report.read"]
    }
  }
}
```

Role hanya berlaku untuk application/client tempat role tersebut dibuat.
Client harus menolak role dari `resource_access` milik client lain.

Permission Pondok dipetakan melalui application role dan mapping role-permission
di Account Management. Jika client membutuhkan permission langsung di token,
client dapat meminta resolusi authorization terverifikasi melalui:

```text
GET /api/applications/{applicationId}/authorization
Authorization: Bearer <access-token>
```

Endpoint tersebut memvalidasi signature, issuer, subject, client (`azp`/`aud`),
membership aktif, dan role client sebelum mengembalikan `roles` serta permission
codes hasil mapping. Client tetap wajib menolak token dengan issuer, audience,
atau client yang tidak sesuai; jangan mengasumsikan nama role otomatis berarti
permission tanpa resolusi tersebut.

## Redirect and logout

Redirect URI harus exact dan environment-specific. Wildcard hanya boleh dipakai
untuk development lokal dan tidak boleh dipromosikan ke production.

Logout client harus mengakhiri session lokal dan mengarahkan user ke Keycloak
end-session endpoint menggunakan `post_logout_redirect_uri` yang terdaftar.

## Pilot acceptance

Sebelum client dinyatakan siap, lakukan pengujian login, callback, token
validation, role denial, logout, expired token, revoked membership, dan secret
rotation pada environment staging.
