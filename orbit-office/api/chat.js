module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak didukung." });
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const prompt = typeof body.message === "string" ? body.message.trim() : "";
    if (!prompt) return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    if (prompt.length > 12000) return res.status(413).json({ error: "Pesan terlalu panjang." });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI belum diaktifkan. Tambahkan OPENAI_API_KEY sebagai environment variable terenkripsi di Vercel agar percakapan diproses model AI."
      });
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const safeHistory = history
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
      .map((item) => ({ role: item.role, content: item.content.slice(0, 4000) }));

    const upstream = await fetch(baseUrl + "/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Anda adalah Orbit, asisten kantor virtual pribadi yang membantu pengguna berbahasa Indonesia menyelesaikan masalah sehari-hari secara praktis. Tanyakan detail penting bila perlu; jika tidak, berikan langkah konkret, asumsi yang jelas, dan risiko yang relevan. Jangan mengarang fakta atau mengaku telah melakukan tindakan eksternal. Sebelum mengirim pesan/email, melakukan pembelian, menghapus data, membuat komitmen, atau tindakan berdampak ke luar, minta persetujuan pengguna. Untuk keputusan medis, hukum, atau keuangan berisiko tinggi, jelaskan batasan dan sarankan verifikasi profesional."
          },
          ...safeHistory,
          { role: "user", content: prompt }
        ],
        temperature: 0.6
      })
    });

    if (!upstream.ok) {
      const status = upstream.status;
      return res.status(502).json({
        error: status === 401 || status === 403
          ? "Kunci AI ditolak. Periksa OPENAI_API_KEY dan izin penyedia."
          : "Penyedia AI gagal memproses permintaan (HTTP " + status + "). Periksa konfigurasi dan coba lagi."
      });
    }
    const result = await upstream.json();
    const answer = result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "Respons AI kosong. Silakan coba lagi." });
    return res.status(200).json({ answer: answer.trim(), model });
  } catch {
    return res.status(500).json({ error: "Permintaan tidak dapat diproses. Periksa jaringan lalu coba lagi." });
  }
};