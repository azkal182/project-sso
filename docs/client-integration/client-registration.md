# Registrasi Application dan OAuth Client

## Urutan registrasi

1. Platform administrator membuat application di Account Management.
2. Buat OAuth client di application tersebut.
3. Pilih `web`, `mobile`, `api`, atau `service`.
4. Isi redirect URI secara exact.
5. Isi web origin sesuai environment.
6. Simpan secret hanya jika client confidential.
7. Buat role application bila diperlukan.
8. Tambahkan user sebagai member dan assign role.
9. Uji token dan authorization endpoint.

## Aturan berdasarkan client type

- `web`: confidential client, Authorization Code + PKCE, redirect URI wajib,
  secret hanya di server.
- `mobile`: public client, Authorization Code + PKCE S256, redirect URI/deep
  link wajib, tanpa secret.
- `api`: resource server atau audience target, tanpa redirect URI dan tanpa
  browser login.
- `service`: Client Credentials, tanpa redirect URI, secret server-only.

Direct Access Grants/password grant tidak digunakan. Untuk service client,
batasi permission sesuai kebutuhan dan jangan memberi role platform-admin.

## Environment separation

Gunakan client ID berbeda untuk local, staging, dan production:

```text
attendance-local
attendance-staging
attendance-production
```

Jangan memakai redirect URI production pada client local atau staging.

## Redirect URI

Gunakan URI exact:

```text
https://attendance.example.com/auth/callback
```

Hindari wildcard di production. HTTP hanya diperbolehkan untuk loopback lokal
(`localhost`, `127.0.0.1`, atau `[::1]`) pada port valid apa pun untuk kebutuhan
development. Domain publik tetap wajib HTTPS.

## Secret handling

- Public client tidak memiliki secret.
- Confidential client secret hanya berada di secret manager/backend.
- Secret tidak boleh masuk Git, frontend bundle, log, atau issue tracker.
- Gunakan rotation endpoint Account Management dan simpan secret baru hanya
  setelah berhasil dicatat oleh owner aplikasi.
- Setelah rotasi, deploy konfigurasi baru sebelum mencabut secret lama agar
  tidak terjadi outage; uji secret lama ditolak setelah grace period.

## Negative cases yang wajib diuji

- redirect URI berbeda satu karakter, hostname, port, path, atau trailing slash;
- wildcard, fragment, atau redirect URI production berbasis HTTP;
- client ID dari environment lain;
- public client mengirim secret;
- `api`/`service` mengirim redirect URI atau mencoba browser login;
- client disabled atau secret lama setelah rotasi.
