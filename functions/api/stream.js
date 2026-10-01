// Cloudflare Pages Function —— 白名单 HTTP 流反向代理
//
// 背景：本站部署为 HTTPS。浏览器会拦截页面里的 http:// 音频（混合内容），
// 且新版 Chrome 还会把 http:// 自动升级成 https:// 后再失败，导致「仅有 HTTP 协议」
// 的电台流无法播放。本函数把这些极少数的 http 流经 Cloudflare 边缘转发为 HTTPS
// 同源地址，使其得以在安全页面上正常播放。
//
// 安全：仅允许下方白名单内的流地址，避免被当作开放代理滥用。
// 用法：GET /api/stream?u=<encodeURIComponent(http:// 流地址)>

const ALLOWED = new Set([
  // Radio Tengri FM —— 哈萨克斯坦（仅提供 http 流，128kbps MP3）
  'http://91.201.214.229:8000/tengrifm',
]);

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export async function onRequestGet({ request }) {
  const target = new URL(request.url).searchParams.get('u');

  if (!target || !ALLOWED.has(target)) {
    return new Response('Forbidden', { status: 403 });
  }

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: {
        'User-Agent': UA,
        Accept: '*/*',
        'Icy-MetaData': '0',
      },
      redirect: 'follow',
    });
  } catch {
    return new Response('Upstream unreachable', { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, { status: 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Access-Control-Allow-Origin', '*');

  // 直接返回上游响应体，Cloudflare 会流式转发，无需缓冲整个音频。
  return new Response(upstream.body, { status: 200, headers });
}
