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
  // The UK 1940s Radio Station —— 生日彩蛋「Marie's 1946 Jukebox」默认台（官网公布的官方流，仅 http）
  'http://solid2.streamupsolutions.com:24929/stream',
  // Swing Street Radio —— 生日彩蛋备选台（美国摇摆乐/大乐队，仅提供 http 流，128kbps MP3）
  // 列表里以带结尾斜杠的形式出现，这里两种写法都登记，避免末尾斜杠差异导致 403
  'http://s6.voscast.com:11312/',
  'http://s6.voscast.com:11312',
  // Serenade Radio UK —— 生日彩蛋备选台（英国 easy listening / 40-60 年代标准曲，192kbps MP3）
  // 实测：https 在 8284 端口上握手失败（SSL_ERROR_SYSCALL），只有 http 可用
  'http://4534.cloudrad.io:8284/',
  'http://4534.cloudrad.io:8284',
]);

// ⚠️ UA 必须用「媒体播放器」而非浏览器 UA。
// 原因：SHOUTcast v2（如 Swing Street Radio 的 s6.voscast.com）会检测浏览器 UA，
// 对浏览器直接返回 302 → 服务器状态页（HTML），而不是音频流；
// 换成播放器 UA 才会返回 200 + audio/mpeg。
// 已实测：Winamp / VLC / curl 均可正常取流，Icecast 系（streamupsolutions、Tengri FM）不受影响。
const UA = 'WinampMPEG/5.09';

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

  // 兜底：极少数流在异常情况下会回吐 HTML（状态页 / 拦截页）。
  // 与其把 HTML 当成音频喂给 <audio>（表现为「一直缓冲」），不如明确失败，
  // 让前端走它已有的「失联」提示与重试流程。
  const upstreamType = upstream.headers.get('content-type') || 'audio/mpeg';
  if (/^text\/html/i.test(upstreamType)) {
    return new Response('Upstream returned a non-audio page', { status: 502 });
  }

  const headers = new Headers();
  headers.set('Content-Type', upstreamType);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Access-Control-Allow-Origin', '*');

  // 直接返回上游响应体，Cloudflare 会流式转发，无需缓冲整个音频。
  return new Response(upstream.body, { status: 200, headers });
}
