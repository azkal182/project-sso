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
- [ ] Logout lokal menghapus session dan cookie aplikasi.
- [ ] Logout penuh mengakhiri session Pondok dan kembali ke redirect URI exact.
- [ ] Session expired dan refresh gagal mengarah ke login ulang.
- [ ] `id_token` tidak diterima sebagai access token API.

## Token validation

- [ ] Signature diverifikasi dengan JWKS.
- [ ] Issuer diverifikasi.
- [ ] Audience diverifikasi.
- [ ] `exp`, `iat`, dan `nbf` diverifikasi.
- [ ] `azp`/client ID diverifikasi.
- [ ] Algorithm JWT dibatasi dan `kid`/JWKS rotation diuji.
- [ ] `sub` digunakan sebagai identity key, bukan email.
- [ ] Raw token tidak ditulis ke log.

## Authorization

- [ ] Role application valid.
- [ ] Role dari client lain ditolak.
- [ ] Permission resolution berhasil.
- [ ] User tanpa membership menerima `403`.
- [ ] Revoked membership menerima `403`.
- [ ] Disabled user tidak dapat mengakses resource.
- [ ] Backend menegakkan authorization tanpa bergantung pada frontend.
- [ ] Cache authorization memiliki TTL dan tidak mengabaikan revocation.
- [ ] `401` dan `403` diuji untuk seluruh negative cases.

## Existing auth

- [ ] Source of truth identity ditetapkan.
- [ ] Mapping `sub` tersedia.
- [ ] Account linking diaudit.
- [ ] Logout behavior disepakati.
- [ ] Session collision tidak terjadi.
- [ ] Account linking memerlukan bukti penguasaan kedua identity.

## Operational

- [ ] Local, staging, dan production client terpisah.
- [ ] Secret rotation diuji.
- [ ] Redirect URI production tidak wildcard.
- [ ] Error `401` dan `403` ditangani berbeda.
- [ ] Runbook troubleshooting tersedia.
- [ ] CSRF diuji untuk seluruh browser mutation dengan cookie session.
- [ ] Client credentials service flow diuji bila digunakan.
- [ ] Mobile redirect/deep-link dan secure token storage diuji bila digunakan.
