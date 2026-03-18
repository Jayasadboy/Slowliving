/**
 * Slow Living OS — Node.js Express Proxy Server
 * ==============================================
 * Alternatif dari Cloudflare Workers jika kamu ingin self-host
 * di VPS, laptop lokal untuk testing, atau server pribadi.
 *
 * Cara menjalankan:
 *   export NOTION_TOKEN=secret_xxx...   (Linux/Mac)
 *   set NOTION_TOKEN=secret_xxx...      (Windows CMD)
 *   node server.js
 *
 * Server akan berjalan di http://localhost:3000
 *
 * Untuk production di VPS:
 *   npm install -g pm2
 *   pm2 start server.js --name slow-living-proxy
 *   pm2 save && pm2 startup
 */

const express = require("express");
const cors    = require("cors");
const fetch   = require("node-fetch");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ─────────────────────────────────────────────────────────────────
// cors() otomatis menangani semua preflight OPTIONS request dan menambahkan
// header yang diperlukan agar browser mengizinkan request dari domain manapun.
app.use(cors());

// express.json() memparse request body bertipe JSON menjadi object JavaScript
// sehingga kita bisa langsung meneruskannya ke Notion API.
app.use(express.json());

// ── Token Guard ────────────────────────────────────────────────────────────────
// Baca token dari environment variable. Dengan cara ini token tidak pernah
// tertanam langsung di dalam kode (hardcoded), yang merupakan praktik keamanan
// yang baik — bayangkan jika kode ini di-commit ke GitHub tanpa token diproteksi.
const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error("\n❌  ERROR: NOTION_TOKEN environment variable belum diset!");
  console.error("   Jalankan: export NOTION_TOKEN=secret_xxxxxxxx\n");
  process.exit(1); // hentikan server daripada berjalan tanpa token
}

// ── Helper: Forward ke Notion ──────────────────────────────────────────────────
// Fungsi reusable yang menerima path Notion (/pages, /pages/:id, dsb),
// method HTTP, dan body request, lalu meneruskan semuanya ke Notion API
// dengan token yang disimpan aman di environment.
async function forwardToNotion(notionPath, method, body) {
  const response = await fetch(`https://api.notion.com/v1${notionPath}`, {
    method,
    headers: {
      "Authorization":  `Bearer ${NOTION_TOKEN}`,
      "Content-Type":   "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

// ── Endpoint: POST /pages ──────────────────────────────────────────────────────
// Semua 6 form di widget (Trading, Keuangan, Lahan, Energi, Harian, Inventaris)
// menggunakan endpoint ini untuk membuat entry baru di database Notion.
//
// Contoh request body dari widget:
// {
//   "parent": { "database_id": "4f476529..." },
//   "properties": {
//     "Nama Trade": { "title": [{ "text": { "content": "EURUSD 17 Mar" } }] },
//     "Hasil": { "select": { "name": "Win" } },
//     ...
//   }
// }
app.post("/pages", async (req, res) => {
  try {
    const { status, data } = await forwardToNotion("/pages", "POST", req.body);
    res.status(status).json(data);
  } catch (err) {
    console.error("Error forwarding POST /pages:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Notion API", detail: err.message });
  }
});

// ── Endpoint: PATCH /pages/:pageId ─────────────────────────────────────────────
// Digunakan untuk update entry yang sudah ada — misalnya mengupdate status
// tanaman yang sudah dipanen, atau menambahkan hasil panen ke entry yang sudah
// dibuat sebelumnya.
app.patch("/pages/:pageId", async (req, res) => {
  try {
    const { status, data } = await forwardToNotion(`/pages/${req.params.pageId}`, "PATCH", req.body);
    res.status(status).json(data);
  } catch (err) {
    console.error("Error forwarding PATCH /pages:", err.message);
    res.status(500).json({ error: "Gagal menghubungi Notion API", detail: err.message });
  }
});

// ── Endpoint: GET /health ──────────────────────────────────────────────────────
// Endpoint sederhana untuk mengecek apakah server berjalan dengan benar.
// Buka http://localhost:3000/health di browser — jika muncul {"ok": true}
// berarti server sudah siap digunakan.
app.get("/health", (_req, res) => {
  res.json({
    ok:      true,
    service: "Slow Living OS Proxy",
    version: "1.0.0",
    time:    new Date().toISOString(),
  });
});

// ── Start Server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Slow Living OS Proxy berjalan di http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Notion token: ${NOTION_TOKEN.slice(0, 12)}... (tersembunyi)\n`);
});
