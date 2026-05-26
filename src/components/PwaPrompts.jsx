import { useEffect, useRef, useState } from "react";
import { updatePwaApp } from "../pwa/initPwa";

export const PwaPrompts = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showOfflineReady, setShowOfflineReady] = useState(false);
  const offlineTimerRef = useRef(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const onAppInstalled = () => {
      setInstallEvent(null);
    };

    const onUpdateReady = () => {
      setShowUpdate(true);
    };

    const onOfflineReady = () => {
      setShowOfflineReady(true);
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
      }
      offlineTimerRef.current = setTimeout(
        () => setShowOfflineReady(false),
        4500,
      );
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("cmstock:pwa-update-ready", onUpdateReady);
    window.addEventListener("cmstock:pwa-offline-ready", onOfflineReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("cmstock:pwa-update-ready", onUpdateReady);
      window.removeEventListener("cmstock:pwa-offline-ready", onOfflineReady);
      if (offlineTimerRef.current) {
        clearTimeout(offlineTimerRef.current);
      }
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;

    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const handleUpdate = async () => {
    await updatePwaApp();
    setShowUpdate(false);
  };

  return (
    <>
      {installEvent ? (
        <div className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-[#1b3d8f]/15 bg-white p-4 shadow-[0_18px_38px_rgba(17,36,74,0.18)]">
          <p className="m-0 text-sm font-semibold text-slate-800">
            Instala CM Stock para abrirlo como app nativa.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setInstallEvent(null)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-xl bg-[#1b3d8f] px-3 py-2 text-sm font-semibold text-white"
            >
              Instalar
            </button>
          </div>
        </div>
      ) : null}

      {showUpdate ? (
        <div className="fixed bottom-4 left-4 right-4 z-[101] mx-auto max-w-md rounded-2xl border border-amber-300/80 bg-amber-50 p-4 shadow-[0_18px_38px_rgba(97,64,0,0.2)]">
          <p className="m-0 text-sm font-semibold text-amber-900">
            Nueva version disponible. Actualiza para usar los ultimos cambios.
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUpdate(false)}
              className="rounded-xl border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900"
            >
              Luego
            </button>
            <button
              type="button"
              onClick={handleUpdate}
              className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Actualizar ahora
            </button>
          </div>
        </div>
      ) : null}

      {showOfflineReady ? (
        <div className="fixed bottom-4 left-4 right-4 z-[99] mx-auto max-w-md rounded-2xl border border-emerald-300/80 bg-emerald-50 p-4 shadow-[0_18px_38px_rgba(2,68,43,0.16)]">
          <p className="m-0 text-sm font-semibold text-emerald-900">
            CM Stock ya esta listo para funcionar sin internet.
          </p>
        </div>
      ) : null}
    </>
  );
};
