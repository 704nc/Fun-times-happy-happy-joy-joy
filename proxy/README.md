# Edge embed proxy

The Microsoft Edge app inside Windows 11 Web shows web pages in an `<iframe>`. Most big sites
send `X-Frame-Options` / `Content-Security-Policy: frame-ancestors` headers that make browsers
refuse to render them in a frame, so they come up blank.

This tiny Cloudflare Worker fetches the page for you, strips those headers, and rewrites links
so navigation stays inside the frame. Deploying it is optional; without it Edge still works for
sites that allow embedding.

## Deploy (5 minutes, free tier)

1. Sign in at https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it (e.g. `win11-web-proxy`) → **Deploy**, then **Edit code**.
3. Replace the editor contents with `proxy/worker.js` from this repo → **Deploy**.
4. Copy the worker URL, e.g. `https://win11-web-proxy.YOURNAME.workers.dev`.
5. Open Windows 11 Web → **Settings → System → Edge web proxy** → paste the URL → Save.

Or with the CLI: `cd proxy && npx wrangler deploy`.

### Lock it to your site (recommended)

In the worker's **Settings → Variables**, add `ALLOWED_ORIGINS` = `https://YOURNAME.github.io`.
Requests whose `Referer`/`Origin` isn't from that site (or the worker itself) get a 403, so
strangers can't use your worker as a free open proxy.

## What it does and doesn't do

- ✅ Strips frame-blocking headers, `<meta http-equiv="Content-Security-Policy">`, and cookies.
- ✅ Rewrites `<a href>`, `<form action>` and nested `<iframe src>` through the proxy.
- ✅ Adds `<base href>` so images, CSS and scripts load straight from the original site.
- ✅ Refuses private / loopback hosts (basic SSRF guard).
- ❌ Logged-in sessions: cookies are dropped, so you're always a logged-out visitor.
- ❌ Single-page apps that navigate via JavaScript (`location = ...`) will escape the proxy.
- ❌ Sites that check `window.top !== window.self` and break out on purpose.
- ❌ Video/DRM, WebSockets, service workers.

It runs comfortably inside the free plan's 100k requests/day.
