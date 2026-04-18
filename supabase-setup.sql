create extension if not exists pgcrypto;

create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  part text not null default '',
  title text not null default '',
  lyrics text not null default '',
  camera text not null default '',
  location text not null default '',
  edit text not null default '',
  duration text not null default '',
  status text not null default '촬영 전',
  description text not null default '',
  image text not null default '',
  feedbacks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenes_sort_order_idx on public.scenes(sort_order);

alter table public.scenes enable row level security;

drop policy if exists "Public read scenes" on public.scenes;
create policy "Public read scenes"
on public.scenes
for select
to anon
using (true);

drop policy if exists "Public insert scenes" on public.scenes;
create policy "Public insert scenes"
on public.scenes
for insert
to anon
with check (true);

drop policy if exists "Public update scenes" on public.scenes;
create policy "Public update scenes"
on public.scenes
for update
to anon
using (true)
with check (true);

drop policy if exists "Public delete scenes" on public.scenes;
create policy "Public delete scenes"
on public.scenes
for delete
to anon
using (true);
