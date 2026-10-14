# RuangAwan — Cloud storage starter

RuangAwan is a distinct cloud-drive application starter using Supabase Auth + private Storage + Edge Functions, and Vercel hosting.

## Features planned
- Email/password and Google OAuth sign-in via Supabase Auth.
- Per-user private storage namespace.
- Upload and download arbitrary file types; resumable upload can be added for large files via TUS.
- File search, folder organization, favorites, trash, storage usage and signed sharing links (future phase).
- Edge Function validates auth and issues short-lived download links.

## Deployment status
The connected Supabase Free organization currently has its two active free projects, so a dedicated Supabase project could not be created. Vercel project creation is blocked by a 403 scope authorization error. Nothing existing was deleted or changed. Once a new Supabase project and Vercel access are available, follow the setup guide in `SETUP.md`.
