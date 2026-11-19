-- AELTRIX Social v1.6 — additive profile schema. Run in Supabase SQL Editor.
-- Supabase stores accounts, searchable profiles, public E2EE keys, presence and invitations.
-- Message history, image bytes and sticker library are stored locally in each browser's IndexedDB.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null default '',
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists e2ee_public_key jsonb;
-- v1.6: separate ECDSA signing identity; do not reuse the ECDH history key.
alter table public.profiles add column if not exists signing_public_key jsonb;
alter table public.profiles enable row level security;
-- Explicit client privileges; row-level policies below still limit writes to the authenticated owner.
revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;
revoke delete on table public.profiles from authenticated;
drop policy if exists "Profiles are publicly searchable" on public.profiles;
create policy "Profiles are publicly searchable" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create index if not exists profiles_username_lower_idx on public.profiles (lower(username));
-- Presence/invitations use Supabase Realtime. Keep Realtime enabled.
-- Existing v1.3 chat_messages rows and aeltrix-chat-media bucket are NOT deleted by this script.
-- The v1.4 app no longer reads or writes chat history/media to Supabase. Delete old cloud data manually only if you have confirmed you no longer need it.
