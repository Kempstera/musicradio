// Cloudflare Pages Function —— 访客数据只读接口（仅站长可访问）
//
// 返回两组数据：
//   stats —— 今日/7 日/累计访客、平均停留、来源榜、页面榜、地区榜、IP 榜、点击榜
//   feed  —— 最近若干次访问（IP 已脱敏，来自 visit_sessions 视图）
//
// 访问控制：
//   必须在 Cloudflare Pages 环境变量里设置 VISITS_TOKEN，调用时通过 ?key= 或
//   x-visits-key 头传入同样的值。未配置 token 时接口一律拒绝 —— 宁可打不开，
//   也不能让访客数据裸奔。
//
// 安全：这里用的是 publishable key（anon 角色），只能读 visit_sessions 视图
// 与 visitor_stats() 函数，读不到 visit_logs 里的原始 IP。

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

const FEED_FIELDS = [
  'session_key',
  'started_at',
  'stay_ms',
  'scroll_pct',
  'path',
  'ref_host',
  'city',
  'region',
  'country',
  'country_code',
  'device',
  'browser',
  'os',
  'ip_masked',
].join(',');

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

  if (!safeEqual(provided, expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 50);
  const signal = AbortSignal.timeout(8000);

  try {
    const [statsRes, feedRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/rpc/visitor_stats`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: '{}',
        signal,
      }),
      fetch(
        `${SUPABASE_URL}/rest/v1/visit_sessions?select=${FEED_FIELDS}&order=started_at.desc&limit=${limit}`,
        { headers: H, signal }
      ),
    ]);

    const stats = statsRes.ok ? await statsRes.json() : null;
    const feed = feedRes.ok ? await feedRes.json() : [];

    if (!stats) {
      // 把上游状态码带出来，便于区分「表还没建」和「权限没配好」
      let hint = 'run supabase/analytics.sql first';
      if (statsRes.status === 404) hint = 'visit_logs / visitor_stats() 不存在，请先执行 supabase/analytics.sql';
      else if (statsRes.status === 401 || statsRes.status === 403) hint = '权限不足，检查 analytics.sql 里的 GRANT 是否执行成功';
      return json(
        {
          error: 'stats_unavailable',
          status: statsRes.status,
          hint,
          feed_ok: feedRes.ok,
          feed_status: feedRes.status,
          feed,
        },
        200
      );
    }

    return json({ stats, feed }, 200);
  } catch {
    return json({ error: 'unavailable' }, 200);
  }
}
