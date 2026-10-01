// Bump VERSION whenever a cached file is replaced under the same name (e.g. a re-encoded loop);
// HTML/JS/CSS are network-first and refresh on their own.
const VERSION = "pocustips-v1";

const SHELL = [
  "./",
  "index.html",
  "about.html",
  "favicon.svg",
  "manifest.webmanifest",
  "assets/css/nocturne.css",
  "assets/css/icons.css",
  "assets/js/dc-runtime.js",
  "assets/js/vendor/react.production.min.js",
  "assets/js/vendor/react-dom.production.min.js",
  "assets/fonts/inter-latin.woff2",
  "assets/fonts/phosphor-regular.woff2",
  "assets/fonts/phosphor-bold.woff2",
  "assets/icons/icon-192.png",
  "assets/posters/plax.webp",
  "assets/posters/psax.webp",
  "assets/posters/a4c.webp",
  "assets/posters/subc.webp",
  "assets/posters/ivc.webp",
  "assets/posters/lung-normal.webp",
  "assets/posters/lung-blines.webp",
  "assets/posters/lung-ptx.webp",
  "assets/posters/lung-consolidation.webp",
  "assets/posters/mmode-compare.webp"
];

const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes("/assets/loops/")) event.respondWith(media(req));
  else if (req.mode === "navigate" || /(\/|\.html|\.js|\.css|\.webmanifest)$/.test(url.pathname)) event.respondWith(networkFirst(req));
  else event.respondWith(cacheFirst(req));
});

self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type !== "warm" || !Array.isArray(data.urls)) return;
  event.waitUntil(warm(data.urls).then(ok => {
    if (event.source) event.source.postMessage({ type: "warm-done", ok });
  }));
});

// Slow hospital Wi-Fi often "connects" but stalls, so fall back to the cached copy after a few seconds.
async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req, { ignoreSearch: true });
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  if (!cached) {
    return network.catch(async () => (req.mode === "navigate" && (await cache.match("index.html"))) || Response.error());
  }
  const timeout = new Promise(resolve => setTimeout(() => resolve(cached), NETWORK_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok && res.status === 200) cache.put(req, res.clone());
  return res;
}

// Video elements issue Range requests and Safari refuses to play a plain 200 in reply,
// so cache the whole file once and answer ranges from it with 206s.
async function media(req) {
  const cache = await caches.open(VERSION);
  let res = await cache.match(req.url);
  if (!res) {
    try {
      res = await fetch(req.url);
    } catch (e) {
      return Response.error();
    }
    if (res.ok && res.status === 200) await cache.put(req.url, res.clone());
    else return res;
  }
  return ranged(req, res);
}

async function ranged(req, res) {
  const range = req.headers.get("range");
  const m = range && /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return res;
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  let start, end;
  if (m[1] === "") { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "video/mp4",
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes"
    }
  });
}

async function warm(urls) {
  const cache = await caches.open(VERSION);
  let ok = true;
  for (const u of urls) {
    const abs = new URL(u, self.registration.scope).href;
    if (await cache.match(abs)) continue;
    try {
      const res = await fetch(abs);
      if (res.ok && res.status === 200) await cache.put(abs, res);
      else ok = false;
    } catch (e) {
      ok = false;
    }
  }
  return ok;
}
