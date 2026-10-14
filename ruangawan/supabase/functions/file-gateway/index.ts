import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Silakan masuk terlebih dahulu." });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    console.error("Missing Supabase environment configuration.");
    return jsonResponse(500, { error: "Konfigurasi penyimpanan belum lengkap." });
  }

  // Forward the caller's JWT so all queries and Storage actions remain under RLS.
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse(401, { error: "Sesi tidak valid. Silakan masuk kembali." });
  }

  let body: { action?: string; fileId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Permintaan tidak valid." });
  }

  if (body.action !== "download" || typeof body.fileId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.fileId)) {
    return jsonResponse(400, { error: "Permintaan unduhan tidak valid." });
  }

  const { data: file, error: fileError } = await supabase
    .from("file_assets")
    .select("id,name,object_path")
    .eq("id", body.fileId)
    .eq("user_id", userData.user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (fileError) {
    console.error("Unable to fetch file metadata:", fileError.message);
    return jsonResponse(500, { error: "Metadata berkas tidak dapat dibaca." });
  }
  if (!file) return jsonResponse(404, { error: "Berkas tidak ditemukan atau bukan milik Anda." });

  const { data: signed, error: signedError } = await supabase.storage
    .from("ruangawan-files")
    .createSignedUrl(file.object_path, 120, { download: file.name });

  if (signedError || !signed?.signedUrl) {
    console.error("Unable to create private download link:", signedError?.message);
    return jsonResponse(500, { error: "Tautan unduhan privat gagal dibuat." });
  }

  return jsonResponse(200, { signedUrl: signed.signedUrl, expiresIn: 120 });
});