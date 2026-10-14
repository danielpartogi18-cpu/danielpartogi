# RuangAwan setup

## Current status
The frontend is deployed at https://ruangawan-cloud.vercel.app, but it shows the setup page until a dedicated Supabase project is ready. Login and file operations are not yet live. The existing Supabase projects have not been modified.

## Required services
- A dedicated Supabase project. Do not reuse a game or finance project's database.
- Vercel project `ruangawan-cloud` (already created). Vercel GitHub auto-deployment still needs a GitHub Login Connection in Vercel, otherwise deploys can be made directly from the Vercel API.
- A custom domain you own or register (not purchased yet).

## Supabase setup
1. Create/activate a dedicated Supabase project. The current Free organization has reached its two active project limit. Upgrade or free a project slot only after confirming the affected project can safely be paused.
2. Enable Email auth and configure email confirmation/password reset URLs.
3. Enable Google OAuth in Supabase Auth; add Google Client ID/Secret in the Supabase dashboard. Add the Supabase callback URL to Google OAuth authorized redirect URIs. Never put the Google client secret in frontend code.
4. Apply `supabase/migrations/001_ruangawan.sql` to that dedicated project.
5. Deploy `supabase/functions/file-gateway/index.ts` as Edge Function `file-gateway` with JWT verification enabled.
6. Use project URL and publishable key below; configure function secrets using the project environment. Do not expose the `service_role` key in frontend code.

## Frontend environment
Set these in Vercel Project Settings → Environment Variables for Production, Preview, and Development as needed:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_EDGE_FUNCTION_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/file-gateway
```

Redeploy after adding environment variables.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## Security and production notes
- Bucket `ruangawan-files` must be private.
- Object keys are namespaced under `{auth.uid()}/...`; RLS enforces the path for SELECT/INSERT/UPDATE/DELETE.
- Signed download links expire after 120 seconds.
- File extension/MIME is not a security boundary. Treat uploads as untrusted and never execute uploaded HTML/JS. Consider malware scanning before sharing.
- For very large files, use TUS resumable upload, not a single multipart request.
- Add enforced quotas/rate limits, abuse reporting, account deletion and backup strategy before public launch.
- This starter does not provide unlimited storage; capacity and cost depend on storage plan and usage.
