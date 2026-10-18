// Cloudflare Pages Function —— 访客面板只读接口
//
// 返回两组数据：
//   stats —— 今日/7 日/累计访客、平均停留、来源榜、页面榜、地区榜、IP 榜、点击榜
//   feed  —— 最近若干次访问（IP 已脱敏，来自 visit_sessions 视图）
//
// 安全：这里用的是 publishable key（anon 角色），只能读 visit_sessions 视图
// 与 visitor_stats() 函数，读不到 visit_logs 里的原始 IP。

const SUPABASE_URL = 'https://xivobmucjutdfoxmfjxu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3-qf8Tpy8aaB8QdvyiR5dg_xx1CzksE';

const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

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

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
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
      return new Response(
        JSON.stringify({
          error: 'stats_unavailable',
          status: statsRes.status,
          hint,
          feed_ok: feedRes.ok,
          feed_status: feedRes.status,
          feed,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        }
      );
    }

    return new Response(JSON.stringify({ stats, feed }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 边缘缓存 30 秒：面板不需要秒级精确，但能挡掉大量重复查询
        'Cache-Control': 'public, max-age=30, s-maxage=30',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
