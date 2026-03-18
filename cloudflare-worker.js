/**
 * Slow Living OS — Cloudflare Workers Proxy
 * ==========================================
 * Fungsi utama file ini adalah menjadi perantara antara widget browser
 * dan Notion API. Browser tidak bisa memanggil Notion API secara langsung
 * karena ada pembatasan CORS (Cross-Origin Resource Sharing), jadi semua
 * request dikirim ke worker ini dulu, lalu worker yang meneruskan ke Notion.
 *
 * Deploy:
 *   1. Buka workers.cloudflare.com → Create Worker
 *   2. Paste seluruh isi file ini
 *   3. Settings → Variables → tambahkan NOTION_TOKEN = secret_xxx...
 *   4. Save and Deploy
 */

export default {
  async fetch(request, env) {

    // ── CORS Headers ──────────────────────────────────────────────────────────
    // Header ini memberitahu browser bahwa request dari domain manapun
    // (termasuk claude.ai) diizinkan masuk ke worker ini.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Browser selalu mengirim "preflight" OPTIONS request sebelum POST yang
    // sesungguhnya — kita jawab langsung dengan 200 OK agar tidak diblokir.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // ── Token Guard ───────────────────────────────────────────────────────────
    // Pastikan environment variable sudah diset di Cloudflare dashboard.
    // Jika belum, kembalikan error yang jelas daripada error Notion yang
    // membingungkan.
    const token = env.NOTION_TOKEN;
    if (!token) {
      return new Response(
        JSON.stringify({ error: "NOTION_TOKEN environment variable belum diset di Cloudflare Workers dashboard." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Routing ───────────────────────────────────────────────────────────────
    // Worker ini mendukung dua endpoint Notion API yang dibutuhkan widget:
    //   POST /pages       → membuat halaman baru di database (semua 6 form)
    //   PATCH /pages/:id  → update halaman yang sudah ada (untuk future use)
    //
    // URL yang dikirim widget: https://your-worker.workers.dev/pages
    // Worker akan meneruskan ke: https://api.notion.com/v1/pages

    const url = new URL(request.url);
    const path = url.pathname; // contoh: "/pages" atau "/pages/abc123"

    // Hanya izinkan path yang diawali /pages untuk keamanan
    if (!path.startsWith("/pages")) {
      return new Response(
        JSON.stringify({ error: "Endpoint tidak valid. Hanya /pages yang didukung." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Susun URL Notion yang sesungguhnya dengan menggabungkan base URL + path
    const notionUrl = `https://api.notion.com/v1${path}`;
    const body = request.method !== "GET" ? await request.text() : undefined;

    // ── Forward Request ke Notion ─────────────────────────────────────────────
    // Kirim request ke Notion dengan token yang tersimpan aman di environment.
    // Token TIDAK pernah terekspos ke browser — ini alasan utama kenapa kita
    // butuh proxy ini.
    const notionResponse = await fetch(notionUrl, {
      method: request.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",   // versi API Notion yang stabil
      },
      body: body,
    });

    // Ambil response dari Notion dan teruskan kembali ke browser
    const responseData = await notionResponse.text();

    return new Response(responseData, {
      status: notionResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  },
};
