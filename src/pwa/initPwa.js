let waitingWorker = null;
let hasShownUpdate = false;

const emitPwaEvent = (name, detail = {}) => {
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

export const initPwa = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    if (import.meta.env.DEV) {
      // Keep dev clean from stale SW/cache when iterating quickly.
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );

      if (window.caches) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      }

      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      const markUpdateAvailable = (worker) => {
        if (!worker || hasShownUpdate) return;
        waitingWorker = worker;
        hasShownUpdate = true;
        emitPwaEvent("cmstock:pwa-update-ready");
      };

      if (registration.waiting) {
        markUpdateAvailable(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed") {
            if (navigator.serviceWorker.controller) {
              markUpdateAvailable(newWorker);
            } else {
              emitPwaEvent("cmstock:pwa-offline-ready");
            }
          }
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    } catch (error) {
      console.error("PWA init failed:", error);
    }
  });
};

export const updatePwaApp = async () => {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    waitingWorker = null;
    hasShownUpdate = false;
  }
};
