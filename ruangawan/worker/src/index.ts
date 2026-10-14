import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { schema } from './schema';

interface Env {
  DB: D1Database;
  RUANGAWAN_FILES: R2Bucket;
  BETTER_AUTH_SECRET: string;
  APP_ORIGIN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
interface FileRow {
  id: string; user_id: string; name: string; object_path: string; mime_type: string;
  size_bytes: number; is_favorite: number; created_at: string; deleted_at: string | null;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
function authFor(env: Env) {
  return betterAuth({
    database: drizzleAdapter(drizzle(env.DB), { provider: 'sqlite', schema }),
    baseURL: env.APP_ORIGIN, basePath: '/api/auth', secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  });
}
function safeName(value: string) {
  const name = value.replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim();
  return name.slice(0, 240) || 'berkas';
}
function contentDisposition(name: string) {
  const fallback = name.replace(/[^\x20-\x7E]|["\\]/g, '_');
  return "attachment; filename=\"" + fallback + "\"; filename*=UTF-8''" + encodeURIComponent(name);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return json({ ok: true, service: 'ruangawan-api', storage: Boolean(env.RUANGAWAN_FILES), database: Boolean(env.DB) });

    const auth = authFor(env);
    if (url.pathname === '/api/auth' || url.pathname.startsWith('/api/auth/')) return auth.handler(request);

    const mutating = ['POST', 'PATCH', 'DELETE'].includes(request.method);
    if (mutating && request.headers.get('Origin') !== env.APP_ORIGIN) return json({ error: 'Asal permintaan tidak diizinkan.' }, 403);

    const sessionResult = await auth.api.getSession({ headers: request.headers });
    const currentUser = sessionResult && sessionResult.user;
    if (!currentUser) return json({ error: 'Sesi tidak ditemukan. Silakan masuk kembali.' }, 401);

    if (url.pathname === '/api/files' && request.method === 'GET') {
      const result = await env.DB.prepare('SELECT id,user_id,name,object_path,mime_type,size_bytes,is_favorite,created_at,deleted_at FROM file_assets WHERE user_id = ? ORDER BY created_at DESC')
        .bind(currentUser.id).all<FileRow>();
      return json((result.results || []).map(row => ({ ...row, is_favorite: Boolean(row.is_favorite), size_bytes: Number(row.size_bytes) })));
    }

    if (url.pathname === '/api/files' && request.method === 'POST') {
      if (!request.body) return json({ error: 'Isi berkas kosong.' }, 400);
      const name = safeName(url.searchParams.get('name') || 'berkas');
      const mime = (request.headers.get('Content-Type') || 'application/octet-stream').split(';')[0].slice(0, 255);
      const declaredSize = Number(request.headers.get('X-File-Size') || request.headers.get('Content-Length') || 0);
      const maxSize = 90 * 1024 * 1024;
      if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > maxSize) return json({ error: 'Ukuran maksimal unggahan saat ini 90 MiB per berkas.' }, 413);
      const id = crypto.randomUUID();
      const objectPath = currentUser.id + '/' + id;
      const createdAt = new Date().toISOString();
      try {
        await env.RUANGAWAN_FILES.put(objectPath, request.body, {
          httpMetadata: { contentType: mime, contentDisposition: contentDisposition(name) },
          customMetadata: { userId: currentUser.id, fileId: id },
        });
        await env.DB.prepare('INSERT INTO file_assets (id,user_id,name,object_path,mime_type,size_bytes,is_favorite,created_at,deleted_at) VALUES (?,?,?,?,?,?,0,?,NULL)')
          .bind(id, currentUser.id, name, objectPath, mime, declaredSize, createdAt).run();
      } catch (error) {
        await env.RUANGAWAN_FILES.delete(objectPath).catch(() => undefined);
        console.error('Upload failed', error);
        return json({ error: 'Berkas gagal disimpan. Periksa konfigurasi R2 dan D1.' }, 500);
      }
      return json({ id, user_id: currentUser.id, name, object_path: objectPath, mime_type: mime, size_bytes: declaredSize, is_favorite: false, created_at: createdAt, deleted_at: null }, 201);
    }

    const match = url.pathname.match(/^\/api\/files\/([0-9a-f-]+)(?:\/(download))?$/i);
    if (!match) return json({ error: 'Endpoint tidak ditemukan.' }, 404);
    const id = match[1];
    const action = match[2];
    const row = await env.DB.prepare('SELECT id,user_id,name,object_path,mime_type,size_bytes,is_favorite,created_at,deleted_at FROM file_assets WHERE id = ? AND user_id = ?')
      .bind(id, currentUser.id).first<FileRow>();
    if (!row) return json({ error: 'Berkas tidak ditemukan atau tidak dapat diakses.' }, 404);

    if (action === 'download' && request.method === 'GET') {
      const object = await env.RUANGAWAN_FILES.get(row.object_path);
      if (!object) return json({ error: 'Objek berkas tidak ditemukan di penyimpanan.' }, 404);
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('Content-Type', row.mime_type || 'application/octet-stream');
      headers.set('Content-Disposition', contentDisposition(row.name));
      headers.set('Content-Length', String(object.size));
      headers.set('Cache-Control', 'private, no-store');
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(object.body, { headers });
    }
    if (action === 'download') return json({ error: 'Metode tidak diizinkan.' }, 405);

    if (request.method === 'PATCH') {
      let body: { is_favorite?: unknown; deleted_at?: unknown };
      try { body = await request.json(); } catch { return json({ error: 'JSON tidak valid.' }, 400); }
      if (typeof body.is_favorite === 'boolean') {
        await env.DB.prepare('UPDATE file_assets SET is_favorite = ? WHERE id = ? AND user_id = ?').bind(body.is_favorite ? 1 : 0, id, currentUser.id).run();
      } else if (body.deleted_at === null || typeof body.deleted_at === 'string') {
        await env.DB.prepare('UPDATE file_assets SET deleted_at = ? WHERE id = ? AND user_id = ?').bind(body.deleted_at, id, currentUser.id).run();
      } else return json({ error: 'Perubahan tidak valid.' }, 400);
      return json({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.RUANGAWAN_FILES.delete(row.object_path);
      await env.DB.prepare('DELETE FROM file_assets WHERE id = ? AND user_id = ?').bind(id, currentUser.id).run();
      return json({ ok: true });
    }
    return json({ error: 'Metode tidak diizinkan.' }, 405);
  },
} satisfies ExportedHandler<Env>;
