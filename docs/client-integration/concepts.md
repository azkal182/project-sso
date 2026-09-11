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
- `access_token`: token untuk memanggil resource server/API.
- `refresh_token`: token untuk memperoleh access token baru, jika policy client
  mengizinkannya.
- `sub`: identifier user yang stabil pada issuer Pondok.
- `azp`: authorized party/client yang meminta token.
- `aud`: audience token.
- `resource_access`: Keycloak client roles.

Jangan menggunakan `email` sebagai primary identity key karena email dapat
berubah atau digunakan oleh lebih dari satu identity lifecycle.
