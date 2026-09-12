# VPS dengan Nginx Existing dan Cloudflare

Panduan ini digunakan jika Nginx sudah berjalan di host VPS dan juga melayani
aplikasi lain. Project tidak memakai container `reverse-proxy` bawaan; Nginx
host menjadi satu-satunya service yang membuka port `80` dan `443`.

## Port dan topology

```text
Cloudflare DNS/Proxy
        |
        v
Nginx existing VPS :80/:443
        |
        +--> 127.0.0.1:18080  Keycloak
        +--> 127.0.0.1:18081  Frontend
        +--> 127.0.0.1:18082  Account Management/health
```

Port project di-bind ke loopback untuk mencegah akses langsung dari internet
dan menghindari konflik dengan aplikasi lain:

| Service | Host bind | Container port |
|---|---:|---:|
| Keycloak | `127.0.0.1:18080` | `8080` |
| Frontend | `127.0.0.1:18081` | `80` |
| Account Management | `127.0.0.1:18082` | `3000` |

Gunakan override yang tersedia:

```bash
docker compose --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.vps.yml \
  config --quiet
docker compose --env-file .env.production \
  -f docker-compose.prod.yml -f docker-compose.vps.yml \
  up -d --build
```

Override menonaktifkan `reverse-proxy` bawaan tanpa menghapus service atau
volume. Jangan menjalankan production Compose tanpa override ini pada VPS
karena proxy bawaan akan mencoba memakai port `80/443`.

## DNS, Cloudflare, dan TLS

Buat record DNS `sso.example.com` dan `admin.example.com` yang mengarah ke IP
VPS. Jika Cloudflare Proxy aktif, pilih SSL/TLS mode `Full (strict)` dan pasang
Cloudflare Origin Certificate atau sertifikat publik valid di Nginx host.
Jangan gunakan mode `Flexible`. Aktifkan HTTPS redirect setelah origin HTTPS
berfungsi.

Cloudflare hanya meneruskan trafik ke Nginx host. Port `18080`, `18081`, dan
`18082` tidak boleh dibuka pada firewall publik; firewall VPS cukup membuka
`80/443` dan SSH yang dibatasi.

## Contoh konfigurasi Nginx host

Sesuaikan hostname dan path certificate. `proxy_params` harus mengirim `Host`,
`X-Real-IP`, dan `X-Forwarded-For`.

```nginx
server {
    listen 80;
    server_name sso.example.com admin.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sso.example.com;
    ssl_certificate /etc/letsencrypt/live/sso.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sso.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location ^~ /admin/ {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        proxy_pass http://127.0.0.1:18080;
        include proxy_params;
        proxy_set_header X-Forwarded-Proto https;
    }
    location / {
        proxy_pass http://127.0.0.1:18080;
        include proxy_params;
        proxy_set_header X-Forwarded-Proto https;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.example.com;
    ssl_certificate /etc/letsencrypt/live/admin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:18081;
        include proxy_params;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Jangan mempercayai header client secara langsung. Jika ingin menerima hanya
trafik Cloudflare, gunakan daftar IP Cloudflare resmi pada firewall/Nginx dan
konfigurasikan real IP secara eksplisit. Jangan expose port `9000` Keycloak,
PostgreSQL, metrics, atau Docker socket.

Validasi dan reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verifikasi coexistence

```bash
curl -fsS https://sso.example.com/realms/pondok/.well-known/openid-configuration
curl -fsS https://admin.example.com/health
ss -lntp | grep -E ':80|:443|:18080|:18081|:18082'
```

Hasil yang diharapkan: `80/443` dimiliki Nginx existing, port aplikasi hanya
listen pada `127.0.0.1`, dan aplikasi lain tetap berjalan. Uji login, callback,
logout, dan API setelah Cloudflare Proxy diaktifkan.
