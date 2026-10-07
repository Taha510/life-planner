const CACHE_NAME = "life-planner-shell-v1";
const APP_ROOT = new URL("./", self.location.href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellUrl = APP_ROOT.href;
      const response = await fetch(shellUrl, { cache: "reload" });
      if (!response.ok) throw new Error("Unable to cache the planner app shell.");
      await cache.put(shellUrl, response.clone());

      const html = await response.text();
      const paths = new Set(["manifest.webmanifest", "planner-icon.svg"]);
      const assetPattern = /(?:src|href)=["']([^"']+)["']/g;
      for (const match of html.matchAll(assetPattern)) {
        const value = match[1];
        if (
          value &&
          !value.startsWith("data:") &&
          !value.startsWith("http:") &&
          !value.startsWith("https:") &&
          !value.startsWith("#")
        ) {
          const assetUrl = new URL(value, shellUrl);
          if (assetUrl.origin === self.location.origin && assetUrl.pathname.startsWith(APP_ROOT.pathname)) {
            paths.add(assetUrl.href);
          }
        }
      }

      await Promise.all(
        [...paths].map(async (path) => {
          const url = new URL(path, shellUrl);
          try {
            const asset = await fetch(url.href, { cache: "reload" });
            if (asset.ok) await cache.put(url.href, asset);
          } catch {
            // The app shell stays installable even if an optional asset is unavailable.
          }
        }),
      );
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("life-planner-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (request.mode === "navigate") {
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(APP_ROOT.href, response.clone());
          return response;
        } catch {
          const shell = await cache.match(APP_ROOT.href);
          if (shell) return shell;
          throw new Error("The Life Planner is not available offline yet.");
        }
      }

      const cached = await cache.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        throw error;
      }
    })(),
  );
});
