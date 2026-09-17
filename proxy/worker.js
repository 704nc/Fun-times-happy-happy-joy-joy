/* Windows 11 Web — Edge embed proxy (Cloudflare Worker)
   Fetches a page on the browser's behalf and strips the headers that stop it being shown
   inside an <iframe> (X-Frame-Options, CSP frame-ancestors). Links and forms inside the
   page are rewritten to stay inside the proxy; other resources load directly via <base>.

   Deploy: see proxy/README.md. Usage: https://your-worker.workers.dev/?url=https://example.com */

const STRIP = ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only',
  'x-content-security-policy', 'x-webkit-csp', 'permissions-policy', 'set-cookie', 'set-cookie2',
  'cross-origin-opener-policy', 'cross-origin-embedder-policy', 'cross-origin-resource-policy', 'report-to', 'nel'];

const BLOCKED_HOST = /^(localhost|.*\.local|.*\.internal|.*\.localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[::1\]|\[fc.*|\[fd.*|\[fe80.*)$/i;

function bad(msg, status) { return new Response(msg, { status: status || 400, headers: { 'content-type': 'text/plain' } }); }

export default {
  async fetch(request, env) {
    const self = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    const target = self.searchParams.get('url');
    if (!target) return bad('Usage: ' + self.origin + '/?url=https://example.com');
    let t;
    try { t = new URL(target); } catch (e) { return bad('Invalid url'); }
    if (!/^https?:$/.test(t.protocol)) return bad('Only http(s) urls are allowed');
    if (BLOCKED_HOST.test(t.hostname)) return bad('Host not allowed', 403);

    // optional allow-list: ALLOWED_ORIGINS = "https://you.github.io,https://other.site"
    if (env && env.ALLOWED_ORIGINS) {
      const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
      const ref = request.headers.get('referer') || request.headers.get('origin') || '';
      const ok = ref.startsWith(self.origin) || allowed.some(a => ref.startsWith(a));
      if (!ok) return bad('This proxy only serves the configured site', 403);
    }

    const proxied = u => self.origin + '/?url=' + encodeURIComponent(u);
    const headers = new Headers();
    for (const k of ['user-agent', 'accept', 'accept-language']) { const v = request.headers.get(k); if (v) headers.set(k, v); }
    headers.set('referer', t.origin + '/');

    let upstream;
    try { upstream = await fetch(t.toString(), { headers, redirect: 'follow', cf: { cacheTtl: 0 } }); }
    catch (e) { return bad('Upstream fetch failed: ' + e.message, 502); }

    const h = new Headers(upstream.headers);
    STRIP.forEach(k => h.delete(k));
    for (const [k, v] of cors()) h.set(k, v);
    h.set('cache-control', 'no-store');
    const finalUrl = upstream.url || t.toString();
    const ct = (h.get('content-type') || '').toLowerCase();

    if (!ct.includes('text/html')) return new Response(upstream.body, { status: upstream.status, headers: h });

    const abs = u => { try { return new URL(u, finalUrl).toString(); } catch (e) { return null; } };
    const rewriter = new HTMLRewriter()
      .on('head', { element(el) { el.prepend(`<base href="${finalUrl.replace(/"/g, '&quot;')}" target="_self">`, { html: true }); } })
      .on('meta[http-equiv]', { element(el) { if (/content-security-policy|x-frame-options/i.test(el.getAttribute('http-equiv') || '')) el.remove(); } })
      .on('base', { element(el) { if (el.getAttribute('href') && !el.getAttribute('href').startsWith(finalUrl)) el.remove(); } })
      .on('a[href]', { element(el) { const u = abs(el.getAttribute('href')); if (u && /^https?:/.test(u)) { el.setAttribute('href', proxied(u)); el.removeAttribute('target'); } } })
      .on('form', { element(el) { const u = abs(el.getAttribute('action') || finalUrl); if (u) el.setAttribute('action', proxied(u)); el.removeAttribute('target'); } })
      .on('iframe[src]', { element(el) { const u = abs(el.getAttribute('src')); if (u && /^https?:/.test(u)) el.setAttribute('src', proxied(u)); } })
      .on('script', { element(el) { if (/frame|top\.location|self\s*!==?\s*top/i.test(el.getAttribute('data-noproxy') || '')) el.remove(); } });
    return rewriter.transform(new Response(upstream.body, { status: upstream.status, headers: h }));
  }
};

function cors() {
  return new Headers({ 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': '*' });
}
