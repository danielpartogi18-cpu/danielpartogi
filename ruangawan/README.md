# RuangAwan — Cloud storage

RuangAwan is a cloud-drive style application built with React + Vite, Cloudflare Workers, D1, R2, and Better Auth.

## Live frontend
- https://ruangawan-cloud.vercel.app
- Vercel project: `ruangawan-cloud`

## Current migration status
- Frontend source is migrated from Supabase SDK to Better Auth and same-origin API calls.
- Cloudflare Worker, D1 schema, R2 file API, and Vercel API proxy source are committed.
- **Cloudflare resources and Worker are not deployed yet.** A D1 database ID and Google OAuth credentials must be configured.
- Until the Worker is deployed and `CLOUDFLARE_WORKER_URL` is set in Vercel, API routes return HTTP 503 and login/upload/download will not work.
- Existing Supabase projects have not been modified or deleted.

## Included
- Email/password authentication and Google OAuth via Better Auth.
- Private R2 object storage with per-user object keys.
- D1 metadata and user isolation.
- List, upload, download, favorite, trash/restore, and permanent delete.
- Vercel API proxy so auth cookies remain first-party on the Vercel domain.
- Initial upload limit: 90 MiB per file.

## Setup
Follow `worker/README.md`. Set `CLOUDFLARE_WORKER_URL` in Vercel only after deploying the Worker and creating the resources.

## Build
`npm install` then `npm run build`.
