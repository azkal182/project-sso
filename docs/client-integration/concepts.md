# Konsep OIDC dan OAuth2

## Endpoint discovery

Jangan hardcode endpoint token atau JWKS. Gunakan:

```text
https://sso.example.com/realms/pondok/.well-known/openid-configuration
```

Issuer yang diharapkan:

```text
https://sso.example.com/realms/pondok
```

## Client types

| Jenis | Pattern | Secret |
|---|---|---|
| Web server | Authorization Code + PKCE | Confidential, server-only |
| React SPA | Authorization Code + PKCE S256 | Public, tanpa secret |
| Mobile | Authorization Code + PKCE S256 | Public, tanpa secret |
| Service | Client Credentials | Confidential, server-only |

Password grant dan Direct Access Grants tidak digunakan.

## Terminologi

- `id_token`: identitas user untuk client OIDC.
- `access_token`: token untuk memanggil resource server/API. Jangan gunakan
  `id_token` sebagai bearer token API.
- `refresh_token`: token untuk memperoleh access token baru, jika policy client
  mengizinkannya.
- `sub`: identifier user yang stabil pada issuer Pondok.
- `azp`: authorized party/client yang meminta token.
- `aud`: audience token.
- `resource_access`: Keycloak client roles.

## Validasi algorithm dan rotasi key

Resource server harus membatasi algorithm JWT sesuai policy aplikasi, menolak
algorithm yang tidak diizinkan, dan mengambil public key dari `jwks_uri` pada
discovery. JWKS boleh di-cache, tetapi cache harus di-refresh ketika `kid` baru
muncul atau ketika verifikasi gagal karena rotasi key. Jangan hardcode public
key di source code.

## Session, token expiry, dan revocation

Access token harus memiliki lifetime terbatas. Saat access token expired, client
melakukan refresh hanya bila policy mengizinkan; bila refresh gagal, hapus
session lokal dan minta login ulang. Perubahan status user, membership, role,
atau permission dapat membuat keputusan authorization sebelumnya stale. Cache
hasil authorization dengan TTL pendek dan jangan cache tanpa batas untuk data
sensitif.

## Mobile dan service-to-service

Mobile/native app adalah public client: gunakan system browser, Authorization
Code + PKCE S256, universal link/app link atau custom scheme yang dikendalikan
aplikasi, dan secure OS token storage. Jangan memasukkan client secret ke APK,
IPA, atau binary.

Service-to-service menggunakan Client Credentials. Token service tidak memiliki
user session; API harus memvalidasi issuer, audience, client/application, scope
atau permission, expiry, dan `azp`. Secret atau private key hanya berada pada
server dan harus dapat dirotasi.

Jangan menggunakan `email` sebagai primary identity key karena email dapat
berubah atau digunakan oleh lebih dari satu identity lifecycle.
