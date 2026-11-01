const CACHE = "livret-citoyen-v3";
const FONT_CACHE = "livret-citoyen-fonts-v1";
const NETWORK_TIMEOUT_MS = 4000;

const PRECACHE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/css/style.css",
  "assets/js/app.js",
  "assets/js/data.js",
  "assets/js/exam.js",
  "assets/js/install.js",
  "assets/js/quiz.js",
  "assets/js/store.js",
  "assets/js/util.js",
  "assets/js/welcome.js",
  "assets/js/views/blocks.js",
  "assets/js/views/exam.js",
  "assets/js/views/home.js",
  "assets/js/views/memo.js",
  "assets/js/views/mistakes.js",
  "assets/js/views/interview.js",
  "assets/js/views/section.js",
  "assets/js/views/section-quiz.js",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/favicon-64.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png",
  "data/p1.json",
  "data/p2.json",
  "data/p3.json",
  "data/p4.json",
  "data/p5.json",
  "data/annexes.json",
  "data/entretien.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = new Set([CACHE, FONT_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** Online: always the latest deploy (keeps JS modules consistent). Offline or slow: the cached copy. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match("./");
      if (shell) return shell;
    }
    throw error;
  }
}

/** Font files never change for a given URL, so the cache wins. */
async function cacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") await cache.put(request, response.clone());
  return response;
}

function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request));
  }
});
