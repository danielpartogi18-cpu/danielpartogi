-- RuangAwan: user-scoped file metadata and private object storage.
-- Apply only to the dedicated RuangAwan Supabase project.
create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 512),
  object_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists file_assets_user_created_idx
  on public.file_assets (user_id, created_at desc);
create index if not exists file_assets_user_deleted_idx
  on public.file_assets (user_id, deleted_at);

alter table public.file_assets enable row level security;
grant select, insert, update, delete on public.file_assets to authenticated;

drop policy if exists "Users can read own file metadata" on public.file_assets;
create policy "Users can read own file metadata" on public.file_assets
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own file metadata" on public.file_assets;
create policy "Users can insert own file metadata" on public.file_assets
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own file metadata" on public.file_assets;
create policy "Users can update own file metadata" on public.file_assets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can delete own file metadata" on public.file_assets;
create policy "Users can delete own file metadata" on public.file_assets
  for delete to authenticated using (user_id = (select auth.uid()));

-- Private bucket; no public object URLs.
insert into storage.buckets (id, name, public)
values ('ruangawan-files', 'ruangawan-files', false)
on conflict (id) do update set public = false;

drop policy if exists "RuangAwan users can read own objects" on storage.objects;
create policy "RuangAwan users can read own objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'ruangawan-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "RuangAwan users can upload own objects" on storage.objects;
create policy "RuangAwan users can upload own objects" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ruangawan-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "RuangAwan users can update own objects" on storage.objects;
create policy "RuangAwan users can update own objects" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ruangawan-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'ruangawan-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "RuangAwan users can delete own objects" on storage.objects;
create policy "RuangAwan users can delete own objects" on storage.objects
  for delete to authenticated using (
    bucket_id = 'ruangawan-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );