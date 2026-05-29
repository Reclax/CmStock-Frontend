const CACHE_NAME = "cmstock-v8";
const OFFLINE_URL = "/offline.html";
const ALLOWED_EXTERNAL_ORIGINS = ["https://api.qrserver.com"];

const APP_SHELL = [
  "/",
  "/index.html",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/image.png",
  "/icons/icon-72.png",
  "/icons/icon-96.png",
  "/icons/icon-128.png",
  "/icons/icon-144.png",
  "/icons/icon-152.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((asset) => cache.add(asset)));

    // Discover Vite hashed assets from index and precache them for first offline use.
    const discoveredAssets = await discoverBuildAssets();
    if (discoveredAssets.length > 0) {
      await Promise.allSettled(discoveredAssets.map((asset) => cache.add(asset)));
    }

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiRequest = isSameOrigin && requestUrl.pathname.startsWith("/api/");

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const clone1 = networkResponse.clone();
          const clone2 = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone1);
            cache.put("/", clone2);
          });
          return networkResponse;
        })
        .catch(async () => {
          const cachedRoute = await caches.match(event.request);
          if (cachedRoute) return cachedRoute;

          const cachedRoot = await caches.match("/");
          if (cachedRoot) return cachedRoot;

          return caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  if (isApiRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedApi = await caches.match(event.request);
          if (cachedApi) return cachedApi;

          return new Response(
            JSON.stringify({
              message: "Sin conexion a internet",
              offline: true,
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }),
    );
    return;
  }

  if (!isSameOrigin && !ALLOWED_EXTERNAL_ORIGINS.some((origin) => requestUrl.href.startsWith(origin))) {
    return;
  }

  const isStaticAsset = isSameOrigin && /^\/assets\//.test(requestUrl.pathname);

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchAndCache = fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchAndCache;
    }),
  );
});

const discoverBuildAssets = async () => {
  try {
    const response = await fetch("/index.html", { cache: "no-store" });
    if (!response.ok) return [];

    const html = await response.text();
    const assets = new Set();
    const assetRegex = /(?:href|src)=\"(\/assets\/[^\"]+)\"/g;
    let match = assetRegex.exec(html);

    while (match) {
      if (match[1]) {
        assets.add(match[1]);
      }
      match = assetRegex.exec(html);
    }

    return Array.from(assets);
  } catch {
    return [];
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response?.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
};
