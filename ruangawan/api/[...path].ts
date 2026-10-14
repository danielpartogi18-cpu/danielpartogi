import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

export const config = { api: { bodyParser: false } };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const workerOrigin = process.env.CLOUDFLARE_WORKER_URL;
  if (!workerOrigin) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Backend Cloudflare belum dikonfigurasi. Tambahkan CLOUDFLARE_WORKER_URL di Vercel.' }));
    return;
  }
  const target = new URL(req.url || '/api', workerOrigin);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || ['host', 'connection', 'content-length'].includes(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  const method = req.method || 'GET';
  const init: RequestInit & { duplex?: 'half' } = { method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(method)) {
    init.body = Readable.toWeb(req) as ReadableStream;
    init.duplex = 'half';
  }
  try {
    const upstream = await fetch(target, init);
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) res.setHeader(key, value);
    });
    const cookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
    if (cookies?.length) res.setHeader('set-cookie', cookies);
    if (!upstream.body) { res.end(); return; }
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
  } catch (error) {
    console.error('Cloudflare Worker proxy failed', error);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Backend penyimpanan tidak dapat dijangkau.' }));
    } else res.end();
  }
}
