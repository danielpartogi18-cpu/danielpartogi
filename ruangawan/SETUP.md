# RuangAwan setup

## Required services
- A dedicated Supabase project (avoid reusing game or finance project databases).
- A Vercel project connected to this GitHub repo, root directory `ruangawan`.
- A new domain registered/owned by you and added to the Vercel project.

## Supabase setup
1. Enable Email auth and configure email confirmation/password reset URLs.
2. Enable Google OAuth in Supabase Auth; add Google Client ID/Secret in the Supabase dashboard. Add Supabase callback URL to Google OAuth authorized redirect URIs. Never put the Google client secret in frontend code.
3. Create a **private** Storage bucket named `ruangawan-files`.
4. Apply `supabase/migrations/001_ruangawan.sql` in Supabase SQL migrations.
5. Deploy function `file-gateway` with JWT verification enabled.
6. Set function secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` as needed. Do not expose `service_role` to browser/client code.

## Frontend environment
Create `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_EDGE_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/file-gateway
```

## Run locally

```bash
npm install
npm run dev
```

## Production notes
- Bucket keys are namespaced under `{auth.uid()}/...` and RLS policies must enforce that prefix for SELECT/INSERT/UPDATE/DELETE.
- Signed download links are short lived. Use private buckets only.
- File extensions/MIME are not security boundaries. Treat uploaded files as untrusted; never execute HTML/JS uploads. Consider malware scanning before public sharing.
- Very large files should use TUS resumable uploads, not a single multipart request.
- Add quotas/rate limits, abuse reporting, account deletion and backup strategy before public launch.
- This starter does not promise unlimited free storage: quotas and billing depend on the chosen storage provider plan and usage.
