// Cloudflare Pages Function —— Supabase 同源反向代理
//
// 为什么需要它：
//   supabase.co 在国内网络基本连不上（TLS 被重置，实测直连 100% 失败）。
//   留言板、登录注册、云端收藏全都要打这个域，于是国内访客看到的是「加载失败」。
//   本站既然已经跑在 Cloudflare 上，就让边缘替访客去连 —— 浏览器只跟本站同源通信。
//
// 只放行两条路径前缀（REST 与 Auth），主机写死，所以它不是一个开放代理：
//   /api/sb/rest/v1/...  → https://<project>.supabase.co/rest/v1/...
//   /api/sb/auth/v1/...  → https://<project>.supabase.co/auth/v1/...
//
// Realtime（WebSocket）不在此列，项目里也没有用到。

const SUPABASE_URL = 'https://xivobmucjutdfoxmfjxu.supabase.co';

// 白名单：路径必须以这些前缀开头
const ALLOWED_PREFIXES = ['/rest/v1/', '/auth/v1/'];

// 这些头是「逐跳」或由边缘重算的，不能原样转发
const STRIP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'content-length',
  'transfer-encoding',
  'upgrade',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

export async function onRequest({ request, params }) {
  const url = new URL(request.url);
  const seg = params && params.path;
  const path = '/' + (Array.isArray(seg) ? seg.join('/') : seg || '');

  if (!ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return new Response('Forbidden', { status: 403 });
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (STRIP_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  let upstream;
  try {
    upstream = await fetch(SUPABASE_URL + path + url.search, init);
  } catch {
    return new Response(JSON.stringify({ error: 'upstream_unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const out = new Headers();
  // set-cookie 可能有多条，必须逐条 append（直接拷 Headers 会被逗号粘成一条）
  const cookies =
    typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'set-cookie') return;
    out.set(key, value);
  });
  for (const c of cookies) out.append('set-cookie', c);

  // fetch 已解压，这两个头不能再回传，否则浏览器会二次解压失败
  out.delete('content-encoding');
  out.delete('content-length');
  out.delete('transfer-encoding');
  out.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
