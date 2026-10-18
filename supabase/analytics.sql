-- ============================================================================
-- 访客行为统计（visit_logs）建表 + 脱敏视图 + 汇总函数
--
-- 用法：Supabase Dashboard → SQL Editor → 整段粘贴执行（可重复执行，幂等）。
--
-- 权限模型（重要）：
--   anon（前端 publishable key）→ 只能 INSERT，**不能 SELECT 原始行**
--   → 原始 IP 永远不出库；页面读的是下面那个 view（IP 已打码）
--   这是为了「统计得到 + 不泄露访客隐私」两者兼顾。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 明细表
-- ---------------------------------------------------------------------------
create table if not exists public.visit_logs (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  -- view=页面浏览 · beat=停留心跳 · leave=离场 · click=链接点击 · play=电台播放
  event         text        not null default 'view',
  visitor_id    text,               -- 同一浏览器持久 UUID（localStorage）
  visit_id      text,               -- 单次会话 UUID（sessionStorage）
  path          text,               -- 页面路径
  referrer      text,               -- 完整来源 URL
  ref_host      text,               -- 来源域名（direct / 站内 / 具体站点）
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  ip            text,               -- 真实 IP（仅本表可见，前端永远读不到）
  country       text,               -- 国家名（Cloudflare 边缘识别）
  country_code  text,
  region        text,
  city          text,
  timezone      text,
  colo          text,               -- 就近接入的 Cloudflare 机房
  asn           integer,            -- 运营商/网络编号
  ua            text,
  device        text,               -- desktop / mobile / tablet / bot
  browser       text,
  os            text,
  lang          text,
  screen        text,
  duration_ms   integer default 0,  -- 累计可见停留（毫秒，心跳递增）
  scroll_pct    smallint default 0, -- 最大滚动深度 %
  target        text,               -- click/play 的目标（链接地址或电台名）
  meta          jsonb
);

comment on table public.visit_logs is '访客行为明细：一次会话写多行（view/beat/leave/click/play）';

create index if not exists visit_logs_created_idx  on public.visit_logs (created_at desc);
create index if not exists visit_logs_visit_idx    on public.visit_logs (visit_id);
create index if not exists visit_logs_visitor_idx  on public.visit_logs (visitor_id);
create index if not exists visit_logs_ip_idx       on public.visit_logs (ip);
create index if not exists visit_logs_event_idx    on public.visit_logs (event);

-- ---------------------------------------------------------------------------
-- 2. 权限：只给 anon 插入权，不给查询权
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant insert on public.visit_logs to anon, authenticated;
grant usage, select on sequence public.visit_logs_id_seq to anon, authenticated;
grant all on public.visit_logs to service_role;

alter table public.visit_logs enable row level security;

drop policy if exists "visit_logs_insert" on public.visit_logs;
create policy "visit_logs_insert" on public.visit_logs
  for insert to anon, authenticated with check (true);

-- 刻意不创建任何 SELECT 策略：anon 读不到原始行（IP 不外泄）

-- ---------------------------------------------------------------------------
-- 3. 会话视图：把一次访问的多行聚合成一条，IP 打码
-- ---------------------------------------------------------------------------
drop view if exists public.visit_sessions;

create view public.visit_sessions as
select
  s.session_key,
  s.started_at,
  s.last_seen,
  s.stay_ms,
  s.scroll_pct,
  s.path,
  s.ref_host,
  s.city,
  s.region,
  s.country,
  s.country_code,
  s.colo,
  s.device,
  s.browser,
  s.os,
  s.lang,
  s.visitor_id,
  -- IP 脱敏：IPv4 隐去末段，IPv6 只留前两组
  case
    when s.ip is null then null
    when position(':' in s.ip) > 0 then split_part(s.ip, ':', 1) || ':' || split_part(s.ip, ':', 2) || ':••••'
    else regexp_replace(s.ip, '\.\d+$', '.x')
  end as ip_masked
from (
  select
    coalesce(nullif(l.visit_id, ''), 'log-' || l.id::text) as session_key,
    min(l.created_at)  as started_at,
    max(l.created_at)  as last_seen,
    max(coalesce(l.duration_ms, 0)) as stay_ms,
    max(coalesce(l.scroll_pct, 0))  as scroll_pct,
    (array_agg(l.path     order by l.created_at) filter (where l.path     is not null))[1] as path,
    (array_agg(l.ref_host order by l.created_at) filter (where l.ref_host is not null))[1] as ref_host,
    (array_agg(l.ip       order by l.created_at) filter (where l.ip       is not null))[1] as ip,
    (array_agg(l.city     order by l.created_at) filter (where l.city     is not null))[1] as city,
    (array_agg(l.region   order by l.created_at) filter (where l.region   is not null))[1] as region,
    (array_agg(l.country  order by l.created_at) filter (where l.country  is not null))[1] as country,
    (array_agg(l.country_code order by l.created_at) filter (where l.country_code is not null))[1] as country_code,
    (array_agg(l.colo     order by l.created_at) filter (where l.colo     is not null))[1] as colo,
    (array_agg(l.device   order by l.created_at) filter (where l.device   is not null))[1] as device,
    (array_agg(l.browser  order by l.created_at) filter (where l.browser  is not null))[1] as browser,
    (array_agg(l.os       order by l.created_at) filter (where l.os       is not null))[1] as os,
    (array_agg(l.lang     order by l.created_at) filter (where l.lang     is not null))[1] as lang,
    (array_agg(l.visitor_id order by l.created_at) filter (where l.visitor_id is not null))[1] as visitor_id
  from public.visit_logs l
  where l.event in ('view', 'beat', 'leave')
  group by coalesce(nullif(l.visit_id, ''), 'log-' || l.id::text)
) s
-- 剔除爬虫/AI 抓取：它们不产生真实收听，混进「今日访客」会虚高
where coalesce(s.device, '') <> 'bot';

comment on view public.visit_sessions is '按会话聚合的访客视图（IP 已脱敏），供前端面板读取';

grant select on public.visit_sessions to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. 汇总函数：一次返回面板需要的全部数字
-- ---------------------------------------------------------------------------
create or replace function public.visitor_stats()
returns jsonb
language sql
security definer
set search_path = public
as $$
with
  t as (
    select
      count(*)                                                              as sessions,
      count(distinct visitor_id)                                            as visitors,
      count(*) filter (where started_at >= now() - interval '24 hours')     as day,
      count(distinct visitor_id) filter (where started_at >= now() - interval '24 hours') as day_visitors,
      count(*) filter (where started_at >= now() - interval '7 days')       as week,
      count(*) filter (where started_at >= date_trunc('day', now()))        as today,
      coalesce(round(avg(nullif(stay_ms, 0)) / 1000.0), 0)                  as avg_stay_sec,
      coalesce(max(stay_ms) / 1000, 0)                                      as max_stay_sec,
      count(*) filter (where stay_ms > 30000)                               as deep_visits
    from public.visit_sessions
  ),
  src as (
    select coalesce(nullif(ref_host, ''), '(direct)') as k, count(*)::int as c
    from public.visit_sessions group by 1 order by c desc limit 6
  ),
  pg as (
    -- 用 view 事件统计页面榜：一次会话可能浏览多个页面，按会话去重会漏掉后续页
    select coalesce(nullif(path, ''), '/') as k, count(*)::int as c
    from public.visit_logs where event = 'view' group by 1 order by c desc limit 6
  ),
  geo as (
    select coalesce(nullif(city, ''), nullif(region, ''), nullif(country, ''), '未知') as k,
           count(*)::int as c
    from public.visit_sessions group by 1 order by c desc limit 8
  ),
  ips as (
    select ip_masked as k, count(*)::int as c
    from public.visit_sessions where ip_masked is not null
    group by 1 order by c desc limit 6
  ),
  clk as (
    select target as k, count(*)::int as c
    from public.visit_logs
    where event in ('click', 'play') and target is not null and target <> ''
    group by 1 order by c desc limit 8
  )
select jsonb_build_object(
  'totals',   (select to_jsonb(t) from t),
  'sources',  (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c) order by c desc), '[]'::jsonb) from src),
  'pages',    (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c) order by c desc), '[]'::jsonb) from pg),
  'geo',      (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c) order by c desc), '[]'::jsonb) from geo),
  'ips',      (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c) order by c desc), '[]'::jsonb) from ips),
  'clicks',   (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'c', c) order by c desc), '[]'::jsonb) from clk)
);
$$;

grant execute on function public.visitor_stats() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. 自检：执行后应返回 0 或若干行（表刚建好时为空）
-- ---------------------------------------------------------------------------
select count(*) as rows_now from public.visit_logs;
