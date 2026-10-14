export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const prompt = typeof body.message === "string" ? body.message.trim() : "";
    if (!prompt) return Response.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
    if (prompt.length > 12000) return Response.json({ error: "Pesan terlalu panjang." }, { status: 413 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: "AI belum diaktifkan. Tambahkan OPENAI_API_KEY sebagai environment variable di Vercel agar percakapan diproses oleh model AI."
      }, { status: 503 });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const safeHistory = history
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }));

    const upstream = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Anda adalah Orbit, asisten kantor virtual pribadi yang membantu pengguna berbahasa Indonesia menyelesaikan masalah sehari-hari secara praktis. Tanyakan detail penting bila perlu; bila tidak, berikan langkah konkret, asumsi yang jelas, dan risiko yang relevan. Jangan mengarang fakta atau mengaku telah melakukan tindakan eksternal. Sebelum mengirim pesan/email, melakukan pembelian, menghapus data, membuat komitmen, atau tindakan berdampak ke luar, minta persetujuan pengguna. Untuk keputusan medis, hukum, atau keuangan berisiko tinggi, jelaskan batasan dan sarankan verifikasi profesional."
          },
          ...safeHistory,
          { role: "user", content: prompt }
        ],
        temperature: 0.6
      }),
      cache: "no-store"
    });

    if (!upstream.ok) {
      const status = upstream.status;
      return Response.json({
        error: status === 401 || status === 403
          ? "Kunci AI ditolak. Periksa OPENAI_API_KEY dan izin penyedia."
          : "Penyedia AI gagal memproses permintaan (HTTP " + status + "). Periksa konfigurasi dan coba lagi."
      }, { status: 502 });
    }

    const result = await upstream.json();
    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return Response.json({ error: "Respons AI kosong. Silakan coba lagi." }, { status: 502 });
    }

    return Response.json({ answer: answer.trim(), model });
  } catch {
    return Response.json({ error: "Permintaan tidak dapat diproses. Periksa jaringan lalu coba lagi." }, { status: 500 });
  }
}
