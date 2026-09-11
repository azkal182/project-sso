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

## Login berulang langsung masuk tanpa form

Keycloak masih memiliki SSO session. Gunakan logout penuh atau parameter
`prompt=login` pada flow development untuk memaksa login ulang.

## User memiliki email yang benar tetapi account salah

Jangan melakukan matching permanen dengan email. Periksa mapping `sub` dan
jalankan account linking yang diaudit.
