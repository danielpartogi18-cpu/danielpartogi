# RuangAwan Cloudflare backend

Cloudflare Workers + D1 + R2 + Better Auth. This backend source is ready for setup, but it is not deployed yet.

## 1. Create resources
- Create a D1 database named ruangawan-db.
- Create a private R2 bucket named ruangawan-files.
- Replace database_id in worker/wrangler.toml with the new D1 database ID.
- Do not reuse or delete any existing Cloudflare resources.

## 2. Configure secrets
From the ruangawan repository directory:
```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```
Use a unique random secret of at least 32 bytes for BETTER_AUTH_SECRET. Do not commit secrets.

## 3. Apply migration and deploy Worker
```bash
npx wrangler d1 migrations apply ruangawan-db --remote --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```
The D1 database must be created first. The config currently contains a placeholder database ID.

## 4. Configure Google OAuth
Google Cloud Console authorized redirect URI:
https://ruangawan-cloud.vercel.app/api/auth/callback/google
Add the client ID and secret as Worker secrets. Update APP_ORIGIN and Google Console if production URL changes.

## 5. Connect Vercel
Set CLOUDFLARE_WORKER_URL in Vercel to the deployed Worker origin, for example https://ruangawan-api.<your-subdomain>.workers.dev. Do not include a path. Redeploy Vercel after saving it. The proxy keeps auth cookies first-party on the Vercel domain.

## Upload size note
The initial endpoint accepts files up to 90 MiB per file and streams them to R2. Larger files should use resumable multipart uploads before public launch.

## Validation
Run npm run build for the frontend. Then run npx wrangler deploy --dry-run --config worker/wrangler.toml after replacing the D1 ID and installing dependencies. Test /api/health, email/password auth, Google OAuth, upload, download, user isolation, trash/restore, and permanent delete.
