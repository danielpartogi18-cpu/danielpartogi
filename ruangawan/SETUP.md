# RuangAwan Cloudflare setup

The frontend source has been migrated from Supabase to Cloudflare Workers + D1 + R2 + Better Auth. Backend infrastructure still requires Cloudflare account setup. Do not delete or change any existing projects.

1. Follow `worker/README.md` to create a dedicated D1 database and R2 bucket, configure Google OAuth, apply the migration, and deploy the Worker.
2. Replace the placeholder D1 `database_id` in `worker/wrangler.toml`.
3. Add Worker secrets `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.
4. Set `CLOUDFLARE_WORKER_URL` in Vercel Production, Preview, and Development environments.
5. Redeploy the Vercel frontend.
6. Test `/api/health`, email/password registration/login, Google OAuth, upload/download, per-user isolation, favorite, trash, restore, and permanent delete.

Google OAuth callback URI: `https://ruangawan-cloud.vercel.app/api/auth/callback/google`

Initial upload limit is 90 MiB per file. Larger files should use resumable multipart uploads in a later iteration.
