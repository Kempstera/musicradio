-- ============================================================================
-- 访客统计 v2 —— 完整明细（含真实 IP）+ 口令门禁
--
-- 与 v1（analytics.sql）的关系：**新增，不替换**。v1 的 visit_logs / visit_sessions
-- / visitor_stats() 全部保留，旧的脱敏看板仍能用；本文件只多开一条「站长专享」的
-- 完整数据通道。
--
-- 为什么要多这一步：
--   前端的 publishable key 是公开的（打包进 JS），所以任何直接授给 anon 的
--   视图/函数都等于公开接口 —— 真实 IP 不能这么放出去。
--   这里的做法是：完整数据只由一个 SECURITY DEFINER 函数返回，且必须带对口令；
--   口令的 md5 存在 private schema 里，anon 既读不到也改不了。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 整段粘贴执行（幂等，可重复跑）。
--
-- 口令：见本次交付说明（一串 28 位随机字符）。想换成自己的，只需把下面的
--   admin_gate 那一行换成 md5('你的新口令') 再执行一次即可。
--   —— md5 在这里只做「等值比对」，不做密码存储，配合长随机串足够。
-- ============================================================================

create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. 口令门禁（只有一行）
-- ---------------------------------------------------------------------------
create table if not exists private.admin_gate (
  id         int primary key default 1 check (id = 1),
  key_md5    text not null,
  updated_at timestamptz not null default now()
);

alter table private.admin_gate enable row level security;
-- 刻意不建任何策略、不授任何权限：anon / authenticated 完全接触不到这张表。

-- 换口令的方法（推荐第一次就换成自己的）：
--   select md5('你想要的任意长口令');          -- 得到 32 位十六进制
--   把下面 values(...) 里的串换成它，整段再执行一次即可。
--   仓库是公开的，所以这里只放 md5、不放明文；28 位以上的随机串做 md5 是安全的。
insert into private.admin_gate (id, key_md5, updated_at)
values (1, 'a6f7331cd93f83682c39d0ec44fc49de', now())
on conflict (id) do update set key_md5 = excluded.key_md5, updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. 完整会话视图（真实 IP + 全部上下文 + 本次会话的页面与动作）
-- ---------------------------------------------------------------------------
drop view if exists private.visit_sessions_full;

create view private.visit_sessions_full as
select
  s.session_key,
  s.started_at,
  s.last_seen,
  s.stay_ms,
  s.scroll_pct,
  s.path,
  s.referrer,
  s.ref_host,
  s.utm_source,
  s.utm_medium,
  s.utm_campaign,
  s.ip,
  s.country,
  s.country_code,
  s.region,
  s.city,
  s.timezone,
  s.colo,
  s.asn,
  s.ua,
  s.device,
  s.browser,
  s.os,
  s.lang,
  s.screen,
  s.visitor_id,
  s.views,
  s.actions,
  s.pages,
  s.targets
from (
  select
    coalesce(nullif(l.visit_id, ''), 'log-' || l.id::text) as session_key,
    min(l.created_at) as started_at,
    max(l.created_at) as last_seen,
    max(coalesce(l.duration_ms, 0)) as stay_ms,
    max(coalesce(l.scroll_pct, 0))  as scroll_pct,
    (array_agg(l.path      order by l.created_at) filter (where l.path      is not null))[1] as path,
    (array_agg(l.referrer  order by l.created_at) filter (where l.referrer  is not null))[1] as referrer,
    (array_agg(l.ref_host  order by l.created_at) filter (where l.ref_host  is not null))[1] as ref_host,
    (array_agg(l.utm_source order by l.created_at) filter (where l.utm_source is not null))[1] as utm_source,
    (array_agg(l.utm_medium order by l.created_at) filter (where l.utm_medium is not null))[1] as utm_medium,
    (array_agg(l.utm_campaign order by l.created_at) filter (where l.utm_campaign is not null))[1] as utm_campaign,
    (array_agg(l.ip        order by l.created_at) filter (where l.ip        is not null))[1] as ip,
    (array_agg(l.country   order by l.created_at) filter (where l.country   is not null))[1] as country,
    (array_agg(l.country_code order by l.created_at) filter (where l.country_code is not null))[1] as country_code,
    (array_agg(l.region    order by l.created_at) filter (where l.region    is not null))[1] as region,
    (array_agg(l.city      order by l.created_at) filter (where l.city      is not null))[1] as city,
    (array_agg(l.timezone  order by l.created_at) filter (where l.timezone  is not null))[1] as timezone,
    (array_agg(l.colo      order by l.created_at) filter (where l.colo      is not null))[1] as colo,
    (array_agg(l.asn       order by l.created_at) filter (where l.asn       is not null))[1] as asn,
    (array_agg(l.ua        order by l.created_at) filter (where l.ua        is not null))[1] as ua,
    (array_agg(l.device    order by l.created_at) filter (where l.device    is not null))[1] as device,
    (array_agg(l.browser   order by l.created_at) filter (where l.browser   is not null))[1] as browser,
    (array_agg(l.os        order by l.created_at) filter (where l.os        is not null))[1] as os,
    (array_agg(l.lang      order by l.created_at) filter (where l.lang      is not null))[1] as lang,
    (array_agg(l.screen    order by l.created_at) filter (where l.screen    is not null))[1] as screen,
    (array_agg(l.visitor_id order by l.created_at) filter (where l.visitor_id is not null))[1] as visitor_id,
    count(*) filter (where l.event = 'view')::int as views,
    count(*) filter (where l.event in ('play', 'click'))::int as actions,
    coalesce(jsonb_agg(distinct l.path) filter (where l.event = 'view' and l.path is not null), '[]'::jsonb) as pages,
    coalesce(jsonb_agg(distinct l.target) filter (where l.event in ('play', 'click') and l.target is not null and l.target <> ''), '[]'::jsonb) as targets
  from public.visit_logs l
  group by coalesce(nullif(l.visit_id, ''), 'log-' || l.id::text), l.ip
) s
where coalesce(s.device, '') <> 'bot';

comment on view private.visit_sessions_full is '站长专享：按会话聚合的完整访问明细（含真实 IP），只经 admin_visits() 口令函数对外提供';

-- ---------------------------------------------------------------------------
-- 3. 取数函数（唯一的读取入口）
-- ---------------------------------------------------------------------------
create or replace function public.admin_visits(
  p_key    text,
  p_days   int default 30,
  p_limit  int default 500,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_ok    boolean;
  v_from  timestamptz;
  v_total int;
  v_rows  jsonb;
begin
  select (g.key_md5 = md5(coalesce(p_key, ''))) into v_ok
  from private.admin_gate g where g.id = 1;

  if v_ok is not true then
    return jsonb_build_object('error', 'unauthorized');
  end if;

  v_from := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)));

  select count(*) into v_total
  from private.visit_sessions_full
  where started_at >= v_from;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.started_at desc), '[]'::jsonb) into v_rows
  from (
    select * from private.visit_sessions_full
    where started_at >= v_from
    order by started_at desc
    limit greatest(1, least(coalesce(p_limit, 500), 5000))
    offset greatest(0, coalesce(p_offset, 0))
  ) t;

  return jsonb_build_object(
    'total', v_total,
    'days',  greatest(1, least(coalesce(p_days, 30), 3650)),
    'limit', greatest(1, least(coalesce(p_limit, 500), 5000)),
    'rows',  v_rows
  );
end;
$$;

revoke all on function public.admin_visits(text, int, int, int) from public;
grant execute on function public.admin_visits(text, int, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 自检
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.visit_logs)                as visit_logs_rows,
  (select count(*) from private.visit_sessions_full)      as sessions,
  (select key_md5 from private.admin_gate where id = 1)   as gate_hash;
