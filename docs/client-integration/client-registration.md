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

Hindari wildcard di production. Wildcard hanya untuk kebutuhan development
lokal yang terkontrol.

## Secret handling

- Public client tidak memiliki secret.
- Confidential client secret hanya berada di secret manager/backend.
- Secret tidak boleh masuk Git, frontend bundle, log, atau issue tracker.
- Gunakan rotation endpoint Account Management dan simpan secret baru hanya
  setelah berhasil dicatat oleh owner aplikasi.
