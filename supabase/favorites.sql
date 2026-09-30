-- 收藏（点赞/My Favorites）功能建表脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行以下语句，然后收藏功能即可启用。

-- 1. 收藏表
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  station_url text not null,
  station_name text not null default '',
  station_genre text not null default '',
  station_country text not null default '',
  country_slug text not null default '',
  hls boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, station_url)
);

-- 2. 索引：按用户快速查收藏
create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists favorites_created_at_idx on public.favorites (created_at desc);

-- 3. 开启行级安全（RLS）
alter table public.favorites enable row level security;

-- 4. 策略：用户只能读写自己的收藏
drop policy if exists "select own favorites" on public.favorites;
create policy "select own favorites" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "insert own favorites" on public.favorites;
create policy "insert own favorites" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "delete own favorites" on public.favorites;
create policy "delete own favorites" on public.favorites
  for delete using (auth.uid() = user_id);

-- 说明：若你之前已有空表 user_favorites（未启用），可选择性删除以保持整洁（不强制）：
-- drop table if exists public.user_favorites;
