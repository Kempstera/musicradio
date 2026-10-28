// Cloudflare Pages Function —— 访客数据只读接口（仅站长可访问）
//
// 两种模式，同一个入口：
//   full   —— 走 Supabase 的 admin_visits() 口令函数：真实 IP、运营商 ASN、完整 UA、
//             屏幕尺寸、本次会话的页面序列与播放/点击目标，一应俱全。
//             需要 supabase/analytics-v2.sql 已执行，并使用那里面设置的口令。
//   legacy —— 走 analytics.sql 的脱敏视图：IP 打码，字段较少，但**没有任何门槛之外的风险**。
//
// 访问控制：
//   Cloudflare Pages 环境变量 VISITS_TOKEN 必须存在。调用时用 ?key= 或 x-visits-key 头。
//   · 传 VISITS_TOKEN 本身 → legacy（脱敏）
//   · 传 analytics-v2 里的口令 → full（完整）
//   两个都不像 → 401。宁可打不开，也不能让访客数据裸奔。
//
// 为什么不在前端直连 Supabase：publishable key 是公开的，一旦把完整视图授给 anon，
// 等于把全站访客的真实 IP 挂在公网上。所以完整数据只从这里出。

const SUPABASE_URL = 'https://xivobmucjutdfoxmfjxu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3-qf8Tpy8aaB8QdvyiR5dg_xx1CzksE';

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign(
      {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
      extra || {}
    ),
  });
}

// 定时安全比较，避免通过响应时间猜口令
function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

function int(v, def, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(n, min), max);
}

// 脱敏视图字段（与 full 模式尽量同名，前端只写一套渲染逻辑）
const LEGACY_FIELDS = [
  'session_key',
  'started_at',
  'last_seen',
  'stay_ms',
  'scroll_pct',
  'path',
  'ref_host',
  'city',
  'region',
  'country',
  'country_code',
  'colo',
  'device',
  'browser',
  'os',
  'lang',
  'visitor_id',
  'ip_masked',
].join(',');

async function fetchFull(key, days, limit, offset, signal) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_visits`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_days: days, p_limit: limit, p_offset: offset }),
    signal,
  });
  if (!r.ok) return { ok: false, status: r.status };
  const data = await r.json();
  if (!data || typeof data !== 'object' || data.error) return { ok: false, status: 200, data };
  return { ok: true, data };
}

async function fetchLegacy(limit, offset, signal) {
  // Supabase 的 REST 单次返回有条数上限（常见 1000），所以要分块取齐
  const CHUNK = 1000;
  const rows = [];
  let total = 0;
  let status = 200;
  for (let fetched = 0; fetched < limit; fetched += CHUNK) {
    const size = Math.min(CHUNK, limit - fetched);
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/visit_sessions?select=${LEGACY_FIELDS}&order=started_at.desc&limit=${size}&offset=${offset + fetched}`,
      { headers: { ...H, Prefer: 'count=exact' }, signal }
    );
    status = r.status;
    if (!r.ok) break;
    const part = await r.json();
    if (!Array.isArray(part) || !part.length) break;
    rows.push(...part);
    const cr = r.headers.get('content-range') || '';
    total = Number((cr.split('/')[1] || '').replace(/\D/g, '')) || total || rows.length;
    if (part.length < size) break;
  }
  return { ok: status >= 200 && status < 300, rows, total: total || rows.length, status };
}

export async function onRequestGet({ request, env }) {
  const expected = env && env.VISITS_TOKEN;

  if (!expected) {
    return json(
      {
        error: 'not_configured',
        hint: '请在 Cloudflare Pages 项目设置里添加环境变量 VISITS_TOKEN（随便一串足够长的随机字符），再重新部署。',
      },
      403
    );
  }

  const url = new URL(request.url);
  const provided = url.searchParams.get('key') || request.headers.get('x-visits-key') || '';
  const isEnvKey = safeEqual(provided, expected);

  const days = int(url.searchParams.get('days'), 30, 1, 3650);
  const limit = int(url.searchParams.get('limit'), 500, 1, 5000);
  const offset = int(url.searchParams.get('offset'), 0, 0, 1e7);
  const signal = AbortSignal.timeout(12000);

  // ① 先试「完整」通道 —— 口令对得上 admin_visits() 才有数据
  if (provided) {
    try {
      const full = await fetchFull(provided, days, limit, offset, signal);
      if (full.ok) {
        return json({
          mode: 'full',
          days,
          limit,
          offset,
          total: full.data.total || 0,
          rows: full.data.rows || [],
          generated_at: new Date().toISOString(),
        });
      }
      // 函数不存在（还没执行 analytics-v2.sql）→ 继续走脱敏通道
      if (!isEnvKey) {
        if (full.status === 401 || full.status === 403) return json({ error: 'unauthorized' }, 401);
        if (full.status === 404) return json({ error: 'unauthorized' }, 401);
        // 200 但返回 unauthorized：说明 v2 已装、口令不对
        if (full.data && full.data.error === 'unauthorized') return json({ error: 'unauthorized' }, 401);
      }
    } catch {
      if (!isEnvKey) return json({ error: 'unavailable' }, 200);
    }
  }

  if (!isEnvKey) return json({ error: 'unauthorized' }, 401);

  // ② 脱敏通道（沿用 analytics.sql 的视图）
  try {
    const lg = await fetchLegacy(limit, offset, signal);
    if (!lg.ok) {
      let hint = 'run supabase/analytics.sql first';
      if (lg.status === 404) hint = 'visit_sessions 视图不存在，请先执行 supabase/analytics.sql';
      else if (lg.status === 401 || lg.status === 403) hint = '权限不足，检查 analytics.sql 里的 GRANT 是否执行成功';
      return json({ error: 'stats_unavailable', status: lg.status, hint }, 200);
    }
    return json({
      mode: 'legacy',
      days,
      limit,
      offset,
      total: lg.total,
      rows: lg.rows,
      generated_at: new Date().toISOString(),
      hint: '当前是「脱敏模式」。在 Supabase 执行 supabase/analytics-v2.sql 后，改用其中的口令进站即可解锁真实 IP、运营商与完整 UA。',
    });
  } catch {
    return json({ error: 'unavailable' }, 200);
  }
}
