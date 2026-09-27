-- Run this in the Supabase SQL Editor before using the dashboard.
-- If you already ran the earlier task-only version, run this updated file
-- again to add the pages and blocks tables.
-- This initial table is intentionally single-user; add authentication and
-- owner_id/RLS policies before publishing to multiple users.

create table if not exists public.tasks (
  id text primary key,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  completed boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_completed_idx on public.tasks (completed);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

create table if not exists public.pages (
  id text primary key,
  parent_id text references public.pages(id) on delete cascade,
  title text not null default 'Untitled' check (char_length(trim(title)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_parent_id_idx on public.pages (parent_id);
create index if not exists pages_updated_at_idx on public.pages (updated_at desc);

create table if not exists public.blocks (
  id text primary key,
  page_id text not null references public.pages(id) on delete cascade,
  type text not null check (type in ('paragraph', 'heading_1', 'heading_2', 'heading_3', 'todo')),
  position integer not null default 0,
  content text not null default '',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blocks_page_position_idx on public.blocks (page_id, position);

alter table public.tasks enable row level security;

-- The API server reaches Supabase through the connected server-side proxy.
-- These policies also make the table usable if the connection is configured
-- with an anon key during development.
drop policy if exists "development task access" on public.tasks;
create policy "development task access"
  on public.tasks
  for all
  using (true)
  with check (true);

alter table public.pages enable row level security;
drop policy if exists "development page access" on public.pages;
create policy "development page access"
  on public.pages
  for all
  using (true)
  with check (true);

alter table public.blocks enable row level security;
drop policy if exists "development block access" on public.blocks;
create policy "development block access"
  on public.blocks
  for all
  using (true)
  with check (true);