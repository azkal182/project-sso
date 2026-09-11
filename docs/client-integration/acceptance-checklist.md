# Client Integration Acceptance Checklist

## Registration

- [ ] Application memiliki owner dan environment.
- [ ] OAuth client type sudah benar.
- [ ] Redirect URI exact.
- [ ] Web origins benar.
- [ ] Secret disimpan di server/secret manager.

## Authentication

- [ ] Discovery document digunakan.
- [ ] Authorization Code + PKCE digunakan untuk browser/mobile.
- [ ] `state` dan `nonce` divalidasi.
- [ ] Client tidak menyimpan password Pondok.
- [ ] Login callback berhasil.
- [ ] Logout berhasil.

## Token validation

- [ ] Signature diverifikasi dengan JWKS.
- [ ] Issuer diverifikasi.
- [ ] Audience diverifikasi.
- [ ] `exp`, `iat`, dan `nbf` diverifikasi.
- [ ] `azp`/client ID diverifikasi.
- [ ] Raw token tidak ditulis ke log.

## Authorization

- [ ] Role application valid.
- [ ] Role dari client lain ditolak.
- [ ] Permission resolution berhasil.
- [ ] User tanpa membership menerima `403`.
- [ ] Revoked membership menerima `403`.
- [ ] Disabled user tidak dapat mengakses resource.
- [ ] Backend menegakkan authorization tanpa bergantung pada frontend.

## Existing auth

- [ ] Source of truth identity ditetapkan.
- [ ] Mapping `sub` tersedia.
- [ ] Account linking diaudit.
- [ ] Logout behavior disepakati.
- [ ] Session collision tidak terjadi.

## Operational

- [ ] Local, staging, dan production client terpisah.
- [ ] Secret rotation diuji.
- [ ] Redirect URI production tidak wildcard.
- [ ] Error `401` dan `403` ditangani berbeda.
- [ ] Runbook troubleshooting tersedia.
