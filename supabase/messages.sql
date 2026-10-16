-- 留言板（messages）建表 + 权限修复脚本
-- 请在 Supabase Dashboard → SQL Editor 中执行。
--
-- 背景 / 症状：
--   前端（publishable/anon key）读取或投稿时报
--   42501  permission denied for table messages
--   注意：这类报错来自「表级 GRANT」这一道门，而不是 RLS 策略。
--   Supabase 的权限有两道独立关卡：
--     ① 表级 GRANT（anon / authenticated 角色上的 SELECT / INSERT / ...）
--     ② RLS 策略（CREATE POLICY）
--   只建策略、不写 GRANT，就会得到 42501。

-- 1. schema 使用权限（一般已具备，幂等补一遍）
grant usage on schema public to anon, authenticated, service_role;

-- 2. 表级 GRANT —— 缺的就是这一段
grant select on public.messages to anon, authenticated;
grant insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

-- 3. 若 id 使用序列（bigserial），补上序列权限（uuid default 时无副作用）
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- 4. 开启 RLS（幂等）
alter table public.messages enable row level security;

-- 5. 策略：所有人可读；仅登录用户可写
drop policy if exists "read_messages" on public.messages;
create policy "read_messages" on public.messages
  for select to anon, authenticated using (true);

drop policy if exists "insert_messages" on public.messages;
create policy "insert_messages" on public.messages
  for insert to authenticated with check (auth.role() = 'authenticated');

drop policy if exists "delete_own_messages" on public.messages;
create policy "delete_own_messages" on public.messages
  for delete to authenticated using (auth.uid() is not null);

-- 6. 自检：执行后应能看到 anon/authenticated 上有 SELECT / INSERT
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='messages' order by 1,2;
