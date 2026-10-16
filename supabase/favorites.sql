-- 收藏（点赞/My Favorites）功能建表脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行以下语句，然后收藏功能即可启用。
--
-- ⚠️ 重要：Supabase 的权限有「两道独立门」——
--     ① 表级 GRANT（anon / authenticated 角色上的 SELECT / INSERT / ...）
--     ② RLS 策略（CREATE POLICY）
--   只建策略、不写 GRANT，就会得到 42501 permission denied for table XXX。
--   本脚本第 3 步即为补上这道门（原版遗漏，导致收藏在线上直接 404/401）。

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

-- 3. 表级 GRANT —— 缺了这一段就会报 42501 / 404
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;

-- 4. 开启行级安全（RLS）
alter table public.favorites enable row level security;

-- 5. 策略：用户只能读写自己的收藏
drop policy if exists "select own favorites" on public.favorites;
create policy "select own favorites" on public.favorites
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own favorites" on public.favorites;
create policy "insert own favorites" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own favorites" on public.favorites;
create policy "update own favorites" on public.favorites
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own favorites" on public.favorites;
create policy "delete own favorites" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);

-- 说明：
--   线上曾存在一张废弃表 public.user_favorites（列名 station_uuid，与前端代码
--   src/lib/favorites.ts 使用的 public.favorites / station_url 完全不匹配，代码从未引用它）。
--   本脚本不删除该表，仅作备案；确认无人使用后可自行 drop。
--
--   旧版错误的空表 public.user_favorites 可选择性删除以保持整洁（不强制）：
-- drop table if exists public.user_favorites;
