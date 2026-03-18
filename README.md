# ⚡ Slow Living OS — Quick Input Hub
## Panduan Integrasi Lengkap

Folder ini berisi semua yang kamu butuhkan untuk menghubungkan
widget Quick Input Hub ke database Notion secara langsung dari browser.

---

## Isi Folder

```
slow-living-proxy/
├── cloudflare-worker.js   ← Deploy ke Cloudflare Workers (direkomendasikan)
├── server.js              ← Alternatif: Node.js Express untuk VPS/lokal
├── package.json           ← Dependencies untuk opsi Node.js
├── widget.html            ← File widget standalone yang bisa dibuka di browser
└── README.md              ← File ini
```

---

## Kenapa Butuh Proxy?

Browser modern menerapkan kebijakan keamanan yang disebut CORS
(Cross-Origin Resource Sharing). Artinya, halaman web tidak bisa
memanggil API dari domain lain secara langsung — termasuk api.notion.com.

Proxy kecil ini berjalan di server (Cloudflare atau Node.js) dan:
1. Menerima request dari browser (dari widget.html)
2. Menambahkan NOTION_TOKEN yang tersimpan aman di environment variable
3. Meneruskan request ke Notion API
4. Mengembalikan response ke browser

Token Notion kamu tidak pernah terekspos ke browser — hanya ada di server.

---

## Pilihan Deploy

### OPSI A: Cloudflare Workers (Direkomendasikan)

**Keunggulan:** Gratis, 0 maintenance, tidak perlu server, deploy 2 menit,
tersedia di seluruh dunia dengan latency rendah.

**Langkah:**

1. Daftar/login di https://workers.cloudflare.com (gratis)

2. Klik "Create a Worker"

3. Hapus semua kode default di editor, paste isi `cloudflare-worker.js`

4. Klik "Save and Deploy"

5. Copy URL worker kamu (contoh: https://slow-living-proxy.namakamu.workers.dev)

6. Di dashboard worker: Settings → Variables → Add variable:
   - Key:   NOTION_TOKEN
   - Value: secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Klik "Encrypt" agar tersimpan aman

7. Buka widget.html, cari baris:
   ```js
   const PROXY_URL = 'YOUR_PROXY_URL_HERE';
   ```
   Ganti dengan URL worker kamu.

**Test:** Buka https://your-worker.workers.dev/health di browser.
Jika muncul respons JSON dengan "ok": true, proxy sudah aktif.

---

### OPSI B: Node.js Express (VPS atau lokal)

**Keunggulan:** Full control, bisa dijalankan di laptop untuk testing lokal
sebelum integrasi ke Cloudflare.

**Langkah instalasi:**

```bash
# Masuk ke folder ini
cd slow-living-proxy

# Install dependencies
npm install

# Set token (Linux/Mac)
export NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Set token (Windows PowerShell)
$env:NOTION_TOKEN="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Jalankan server
npm start
```

Server berjalan di http://localhost:3000

Test: buka http://localhost:3000/health — jika muncul {"ok": true}, server aktif.

**Untuk production di VPS (agar tetap berjalan setelah logout):**

```bash
npm install -g pm2
pm2 start server.js --name slow-living-proxy
pm2 save
pm2 startup
```

---

## Setelah Proxy Aktif

1. Buka `widget.html` di browser (bisa double-click langsung sebagai file lokal,
   atau upload ke hosting manapun)

2. Cari dan ganti satu baris ini:
   ```js
   const PROXY_URL = 'YOUR_PROXY_URL_HERE';
   ```
   Dengan URL proxy kamu. Simpan file.

3. Refresh browser, coba submit satu entry test dari tab "Harian"

4. Buka database Kesehatan & Ritme Harian di Notion — entry baru harus muncul

---

## Troubleshooting

**"PROXY_URL belum diisi"**
→ Kamu belum mengganti YOUR_PROXY_URL_HERE di widget.html

**"NOTION_TOKEN environment variable belum diset"**
→ Di Cloudflare: Settings → Variables → tambahkan NOTION_TOKEN
→ Di Node.js: export NOTION_TOKEN=secret_xxx sebelum npm start

**"Could not find database"**
→ Integration belum di-connect ke database. Buka setiap database di Notion,
  klik ··· → Add connections → pilih integration "Slow Living OS"

**"Unauthorized"**
→ Token salah atau sudah expired. Buat token baru di notion.so/my-integrations

**Data masuk tapi ada field yang kosong**
→ Pastikan nama property di database Notion persis sama dengan yang ada di
  kode widget.html (case-sensitive)

---

## Database IDs (untuk referensi)

Keuangan  : fdaca666-c06e-4f36-bccb-24e97d56c84c
Trading   : 4f476529-bcbc-4ae4-9c1b-9b88b01344ea
Lahan     : d36dbfbf-9bcf-4c6c-acfa-2436be77ac77
Energi    : ea8d0daa-2149-4074-b878-f9956814df10
Harian    : 92827689-1915-4b84-bd54-30c6523210d4
Inventaris: 75a2b041-1c8a-46d2-bce1-67429716e18d

---

*Slow Living OS — Kebumen | Dibuat Maret 2026*
