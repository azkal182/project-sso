# Integrasi dengan Existing Authentication

## Pilihan arsitektur

### Pilihan A — Migrasi ke Pondok sebagai authentication utama

```text
User --> Pondok SSO --> Application
```

Ini adalah pilihan yang direkomendasikan untuk jangka panjang. Authentication
lama dapat dipertahankan sementara selama migrasi, tetapi tidak boleh menjadi
sumber identity yang ambigu.

### Pilihan B — Existing auth tetap aktif, Pondok sebagai identity tambahan

```text
User
 ├── Existing authentication
 └── Pondok SSO
```

Gunakan pilihan ini hanya jika ada kebutuhan bisnis yang jelas.

## Account linking

Simpan relasi external identity:

```text
user_identities
├── user_id
├── provider = pondok
├── subject = Keycloak sub
├── email_at_link
├── linked_at
└── last_login_at
```

Best practice:

- gunakan `sub` sebagai external identity key;
- email hanya dipakai untuk matching awal/approval;
- jangan auto-link akun hanya berdasarkan email tanpa policy;
- audit link, unlink, dan account takeover prevention;
- verifikasi bahwa user menguasai kedua identity sebelum linking.

## Session dan logout

Tentukan secara eksplisit:

- auth mana yang menjadi source of truth;
- apakah logout lokal juga logout Pondok;
- apa yang terjadi jika user disabled di Pondok;
- token mana yang dipercaya API;
- bagaimana user existing dipetakan ke `sub`.

Jangan menjalankan dua session dengan nama cookie dan lifecycle yang sama.
