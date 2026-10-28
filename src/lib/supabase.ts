import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config';

// 浏览器端 Supabase 客户端（单例）
//
// 为什么要套一层 fetch：
//   supabase.co 在国内网络基本连不上（TLS 被重置，实测直连 100% 失败）。
//   留言板、登录注册、云端收藏都要打这个域，于是国内访客看到的是「加载失败」。
//   站点本身在 Cloudflare 上，于是把 REST 与 Auth 请求改成同源地址 /api/sb/...，
//   由边缘函数（functions/api/sb/[[path]].js）替访客去连 Supabase ——
//   浏览器全程只跟本站通信，不再受那条链路影响。
//
//   只重写这两段路径，其余（Realtime WebSocket 等）原样放行。

const ORIGIN = SUPABASE_URL.replace(/\/+$/, '');
const PROXY_BASE = '/api/sb';

function rewrite(url: string): string | null {
  if (!url.startsWith(ORIGIN)) return null;
  const rest = url.slice(ORIGIN.length);
  if (rest.startsWith('/rest/v1') || rest.startsWith('/auth/v1')) return PROXY_BASE + rest;
  return null;
}

const proxyFetch: typeof fetch = async (input, init) => {
  const direct = () => fetch(input as RequestInfo, init);

  let target: string | null = null;
  try {
    if (typeof input === 'string') target = rewrite(input);
    else if (input instanceof URL) target = rewrite(input.href);
    else target = rewrite((input as Request).url);
  } catch {
    target = null;
  }
  // 不在白名单里（或解析失败）→ 原样放行，绝不因为代理逻辑把功能弄坏
  if (!target) return direct();

  try {
    let res: Response;
    if (input instanceof Request) {
      const req = input;
      const noBody = req.method === 'GET' || req.method === 'HEAD';
      res = await fetch(target, {
        method: req.method,
        headers: req.headers,
        body: noBody ? undefined : req.body,
        redirect: req.redirect,
        credentials: req.credentials,
        signal: init?.signal || req.signal,
        ...init,
      } as RequestInit);
    } else {
      res = await fetch(target, init);
    }

    // 边缘代理自己出问题（不是 Supabase 的错）→ 退回直连再试一次
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      const peek = await res.clone().text().catch(() => '');
      if (res.status !== 503 || /upstream_unreachable|supabase|rest\/v1/i.test(peek)) {
        try {
          return await direct();
        } catch {
          /* 直连也失败，保留代理的响应 */
        }
      }
    }
    return res;
  } catch {
    return direct();
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: proxyFetch,
  },
});
