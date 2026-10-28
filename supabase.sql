-- Patatogo : base de données + sécurité. À coller dans Supabase > SQL Editor > Run.

create table if not exists public.docs (
  path text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.docs enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create policy "admins_self" on public.admins for select to authenticated
  using (user_id = auth.uid());

-- Lecture : tout est lisible par les joueurs connectés, sauf les sauvegardes
-- privées (saves/) et les boîtes de réception (ev/) qui sont personnelles.
create policy "docs_read" on public.docs for select to authenticated using (
  (path not like 'saves/%' and path not like 'ev/%')
  or path = 'saves/' || auth.uid()::text
  or path like 'ev/' || auth.uid()::text || '/items/%'
);

-- Écriture
create policy "docs_insert" on public.docs for insert to authenticated with check (
  path = 'players/' || auth.uid()::text
  or path = 'saves/' || auth.uid()::text
  or ((path like 'cfg/%' or path like 'cards/%') and public.is_admin())
  or path like 'clubs/%'
  or path like 'ev/%/items/%'
);
create policy "docs_update" on public.docs for update to authenticated using (
  path = 'players/' || auth.uid()::text
  or path = 'saves/' || auth.uid()::text
  or ((path like 'cfg/%' or path like 'cards/%') and public.is_admin())
  or path like 'clubs/%'
) with check (
  path = 'players/' || auth.uid()::text
  or path = 'saves/' || auth.uid()::text
  or ((path like 'cfg/%' or path like 'cards/%') and public.is_admin())
  or path like 'clubs/%'
);
create policy "docs_delete" on public.docs for delete to authenticated using (
  path = 'players/' || auth.uid()::text
  or path = 'saves/' || auth.uid()::text
  or ((path like 'cfg/%' or path like 'cards/%') and public.is_admin())
  or path like 'clubs/%'
  or path like 'ev/' || auth.uid()::text || '/items/%'
);

-- Pour te rendre administrateur (après avoir créé ton compte dans le jeu) :
-- insert into public.admins (user_id) select id from auth.users where email = 'ton@email.com';
