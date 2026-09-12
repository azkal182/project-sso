# Troubleshooting

## `invalid_redirect_uri`

Periksa bahwa redirect URI request sama persis dengan URI pada OAuth client,
termasuk protocol, hostname, port, path, dan trailing slash.

## `invalid_client`

- Confidential client harus mengirim secret dari server.
- Public client tidak boleh mengirim secret palsu.
- Pastikan client ID berasal dari environment yang benar.

## `401 Unauthorized`

Periksa:

- bearer token tersedia;
- token belum expired;
- issuer sesuai;
- signature/JWKS dapat diverifikasi;
- audience sesuai API;
- `azp` sesuai client.

## `403 Forbidden`

Token valid tetapi salah satu kondisi berikut gagal:

- user tidak active;
- membership tidak ada atau disabled;
- client bukan milik application;
- role tidak sesuai;
- permission tidak ter-resolve.

## `id_token` ditolak API

Ini perilaku yang benar. Gunakan `access_token` dengan audience dan `azp` yang
terdaftar pada application API. `id_token` hanya membuktikan identitas kepada
OIDC client.

## JWKS atau `kid` tidak ditemukan

Refresh discovery/JWKS cache secara aman, pastikan issuer dan hostname benar,
dan jangan mematikan signature verification sebagai workaround. Jika key baru
belum tersedia, retry terbatas lalu kembalikan `401`.

## Logout kembali ke aplikasi tetapi session masih aktif

Pastikan session lokal dihancurkan sebelum redirect, gunakan OIDC end-session
endpoint untuk single logout, kirim `id_token_hint` bila tersedia, dan pastikan
`post_logout_redirect_uri` sama persis dengan konfigurasi client.

## `403` pada request browser mutation

Pastikan cookie session dikirim dan header CSRF (`x-csrf-token` pada Pondok)
berisi token terbaru. Jangan mengganti CSRF protection dengan `SameSite` saja.

## Service token tidak memiliki user subject

Client Credentials mewakili service, bukan user. Gunakan `azp`, audience,
scope/permission, dan policy service; jangan melakukan lookup membership user
berdasarkan `sub` yang tidak ada.

## Login berulang langsung masuk tanpa form

Keycloak masih memiliki SSO session. Gunakan logout penuh atau parameter
`prompt=login` pada flow development untuk memaksa login ulang.

## User memiliki email yang benar tetapi account salah

Jangan melakukan matching permanen dengan email. Periksa mapping `sub` dan
jalankan account linking yang diaudit.
