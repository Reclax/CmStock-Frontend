import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { FiCamera, FiXCircle, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";

const QR_PREFIX = "CMSTOCK:";

const parseQrPayload = (raw) => {
  if (!raw.startsWith(QR_PREFIX)) {
    return null;
  }

  const payloadText = raw.slice(QR_PREFIX.length);

  try {
    const parsed = JSON.parse(payloadText);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Mantiene compatibilidad con los QR antiguos basados solo en texto.
  }

  const parts = payloadText.split(":");
  const type = parts[0];
  const id = parts.slice(1).join(":") || payloadText;

  return {
    type: type ? type.toLowerCase() : "legacy",
    id,
  };
};

export const EtiquetasQrPage = () => {
  const [scanResult, setScanResult] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanData, setScanData] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const readerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(
    () => () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    },
    [],
  );

  const handleScanMatch = (raw) => {
    const payload = parseQrPayload(raw);

    setScanResult(raw);
    setScanData(payload);

    if (!payload) {
      setScanError("El QR no corresponde al formato de CmStock.");
      return;
    }

    setScanError("");
  };

  const startScanner = async () => {
    setScanError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanError("Este navegador no permite usar la cámara.");
      return;
    }

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScannerActive(true);

      if (!videoRef.current) {
        setScannerActive(false);
        setScanError("No se pudo preparar la vista de la cámara.");
        return;
      }

      await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanMatch(result.getText());
            reader.reset();
            setScannerActive(false);
          }

          if (error && error.name !== "NotFoundException") {
            setScanError("Error durante el escaneo.");
          }
        },
      );
    } catch (error) {
      console.error("Error iniciando el scanner:", error);
      setScannerActive(false);
      setScanError(
        "No fue posible iniciar el escáner. Verifica permisos de cámara y que el sitio use HTTPS o localhost.",
      );
    }
  };

  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScannerActive(false);
  };

  return (
    <section className="space-y-6">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Escaner QR
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Activa la camara para leer etiquetas QR de las muestras.
          </p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <article className="qr-info-card qr-scanner-card">
          <div className="qr-info-card-head">
            <p className="qr-eyebrow">Lectura de camara</p>
            <h3>Escaneo rapido</h3>
          </div>
          <p className="muted-text">
            Usa la camara del dispositivo para leer el QR completo de la muestra.
          </p>
          <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-[#0b1020]">
            <video ref={videoRef} className="h-full w-full object-cover min-h-[320px]" muted />
          </div>

          <div className="button-row qr-actions-row flex gap-2">
            {!scannerActive ? (
              <button
                type="button"
                className="primary-btn flex w-full items-center justify-center gap-2 sm:w-auto"
                onClick={startScanner}
              >
                <FiCamera className="h-4 w-4" />
                Iniciar escaneo
              </button>
            ) : (
              <button
                type="button"
                className="danger-btn mt-0 flex w-full items-center justify-center gap-2 sm:w-auto"
                onClick={stopScanner}
              >
                <FiXCircle className="h-4 w-4" />
                Detener camara
              </button>
            )}
          </div>
          {scanResult && (
            <div className="mt-4 space-y-2">
              <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                Ultima lectura: {scanResult}
              </p>
              {scanData?.id ? (
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  ID detectado: {scanData.id}
                </p>
              ) : null}
            </div>
          )}
          {scanError && (
            <p className="error-text mt-4 flex items-center gap-2">
              <FiAlertTriangle className="h-4 w-4 shrink-0" />
              {scanError}
            </p>
          )}
        </article>
      </div>
    </section>
  );
};
