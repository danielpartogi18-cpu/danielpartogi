# RuangAwan — Cloud storage starter

RuangAwan is a cloud-drive application starter with a distinct visual identity, built with React + Vite and Supabase Auth, private Storage, and an authenticated Edge Function.

## Live Vercel deployment

- URL: https://ruangawan-cloud.vercel.app
- Vercel project: `ruangawan-cloud`
- Project is deployed and build status is READY.
- The live site currently shows its connection setup page. Login, uploads, and downloads are not enabled until a dedicated Supabase project is configured.
- A custom purchased domain has not yet been registered. The Vercel-provided domain is live.

## Included in this repository

- Email/password sign-in and Google OAuth UI via Supabase Auth.
- Private per-user file namespace.
- Upload any browser-supported file type to private Supabase Storage.
- Listing, search, favorites, trash/restore, and download actions.
- RLS-protected file metadata and storage policies.
- `file-gateway` Edge Function to produce short-lived private download links.
- Responsive Indonesian UI for desktop and mobile.

## Infrastructure blocker

The connected Supabase Free organization currently has two active projects and has hit the two-project free-plan limit. No existing project was paused or altered because the known projects may be in use. The Supabase Edge Function and SQL migration are therefore committed as source but are **not deployed** yet.

Vercel GitHub auto-linking also requires a GitHub Login Connection in Vercel. The current initial production deployment was created from source files directly; future push-to-deploy automation is not yet configured.

For setup and deployment instructions, see `SETUP.md`.