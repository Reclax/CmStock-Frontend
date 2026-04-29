import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { generateQrDataUrl } from "../utils/qr";

const QR_PREFIX = "CMSTOCK:";

const buildSamplePayload = (sample, catalogs) => ({
  type: "muestra",
  version: 1,
  id: sample.id,
  referencia: sample.referencia || "",
  modelo: sample.modelo || "",
  segmento: sample.segmento || "",
  pareselaborados: Number(sample.pareselaborados) || 0,
  fechaelaboracion: sample.fechaelaboracion || "",
  estado: sample.estado || "",
  dima: sample.dima || "",
  licenciado: Boolean(sample.licenciado),
  talla: sample.talla || "",
  proceso: sample.proceso || "",
  observaciones: sample.observaciones || "",
  cliente: {
    id: sample.clienteid || "",
    nombre: catalogs.clientesMap[sample.clienteid] || "",
  },
  molderia: {
    id: sample.molderiaid || "",
    nombre: catalogs.molderiasMap[sample.molderiaid] || "",
  },
  ubicacion: {
    id: sample.ubicacionid || "",
    nombre: catalogs.ubicacionesMap[sample.ubicacionid] || "",
  },
  disenador: {
    id: sample.disenadorid || "",
    nombre: catalogs.usuariosMap[sample.disenadorid] || "",
  },
});

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

const QrCard = ({
  title,
  subtitle,
  value,
  onChange,
  options,
  previewLabel,
  previewValue,
  qrUrl,
  onPrint,
  isPrintTarget,
}) => (
  <article className="qr-generator-card">
    <div className="qr-card-heading">
      <div>
        <p className="qr-eyebrow">Etiqueta principal</p>
        <h2>{title}</h2>
      </div>
      <p className="qr-card-subtitle">{subtitle}</p>
    </div>

    <div className="qr-selector">
      <label>
        Selecciona una muestra
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecciona</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>

    <div
      className={`qr-preview qr-print-card ${isPrintTarget ? "is-printing" : ""}`}
    >
      {previewValue ? (
        <>
          <div className="qr-preview-copy">
            <p className="qr-preview-title">{previewLabel}</p>
            <strong>{previewValue}</strong>
          </div>
          <div className="qr-code-frame">
            {qrUrl ? (
              <img src={qrUrl} alt={title} width="220" height="220" />
            ) : null}
          </div>
        </>
      ) : (
        <div className="qr-empty-state">
          <p>Selecciona una muestra para generar la etiqueta.</p>
        </div>
      )}

      <button
        type="button"
        className="secondary-btn qr-print-btn"
        onClick={onPrint}
      >
        Imprimir etiqueta
      </button>
    </div>
  </article>
);

export const EtiquetasQrPage = () => {
  const muestras = useCrud(ENDPOINTS.muestras);
  const catalogs = useCatalogData();
  const { clientesMap, molderiasMap, ubicacionesMap, usuariosMap } = catalogs;
  const [selectedMuestra, setSelectedMuestra] = useState("");
  const [muestraQrUrl, setMuestraQrUrl] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [scanError, setScanError] = useState("");
  const [scanData, setScanData] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [printTarget, setPrintTarget] = useState("");
  const readerRef = useRef(null);
  const videoRef = useRef(null);

  const muestraOptions = useMemo(
    () =>
      muestras.items.map((item) => ({
        id: item.id,
        label: `${item.referencia} - ${item.modelo || "Sin modelo"}`,
      })),
    [muestras.items],
  );

  const selectedMuestraData = useMemo(
    () => muestras.items.find((item) => item.id === selectedMuestra),
    [muestras.items, selectedMuestra],
  );

  const { load: loadMuestras } = muestras;

  useEffect(() => {
    loadMuestras();
  }, [loadMuestras]);

  useEffect(() => {
    const run = async () => {
      if (!selectedMuestraData) {
        setMuestraQrUrl("");
        return;
      }

      const payload = buildSamplePayload(selectedMuestraData, {
        clientesMap,
        molderiasMap,
        ubicacionesMap,
        usuariosMap,
      });
      setMuestraQrUrl(
        await generateQrDataUrl(`${QR_PREFIX}${JSON.stringify(payload)}`),
      );
    };

    run();
  }, [
    selectedMuestraData,
    clientesMap,
    molderiasMap,
    ubicacionesMap,
    usuariosMap,
  ]);

  useEffect(() => {
    const clearPrintTarget = () => setPrintTarget("");
    window.addEventListener("afterprint", clearPrintTarget);
    return () => window.removeEventListener("afterprint", clearPrintTarget);
  }, []);

  const printCard = (target) => {
    setPrintTarget(target);
    setTimeout(() => window.print(), 0);
  };

  const handleScanMatch = (raw) => {
    const payload = parseQrPayload(raw);

    setScanResult(raw);
    setScanData(payload);

    if (!payload) {
      setScanError("El QR no corresponde al formato de CmStock.");
      return;
    }

    const muestraMatch = muestras.items.find((item) => item.id === payload.id);
    if (muestraMatch) {
      setSelectedMuestra(muestraMatch.id);
      setScanError("");
      return;
    }

    setScanError("El QR fue detectado, pero no se encontro la referencia.");
  };

  const startScanner = async () => {
    setScanError("");

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScannerActive(true);

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;

      if (!deviceId || !videoRef.current) {
        setScanError("No se encontro camara disponible.");
        return;
      }

      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScanMatch(result.getText());
            reader.reset();
            setScannerActive(false);
          }

          if (error && error.name !== "NotFoundException") {
            setScanError("Error durante escaneo.");
          }
        },
      );
    } catch {
      setScanError("No fue posible iniciar el scanner.");
    }
  };

  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScannerActive(false);
  };

  return (
    <section className="qr-page">
      <header className="qr-hero">
        <div className="qr-hero-copy">
          <p className="qr-eyebrow">Etiquetado y trazabilidad</p>
          <h1>Etiqueta QR de muestra</h1>
          <p>
            Genera una etiqueta general con toda la informacion clave de la
            muestra, escaneala desde el celular y imprimela lista para usar.
          </p>
        </div>

        <div className="qr-hero-chips">
          <span>Un solo QR por muestra</span>
          <span>Diseño responsive</span>
          <span>Impresión directa</span>
        </div>
      </header>

      <div className="qr-layout">
        <QrCard
          title="QR de muestra"
          subtitle="Etiqueta de trazabilidad con toda la ficha de la muestra."
          value={selectedMuestra}
          onChange={setSelectedMuestra}
          options={muestraOptions}
          previewLabel="Muestra"
          previewValue={
            selectedMuestraData ? selectedMuestraData.referencia : ""
          }
          qrUrl={muestraQrUrl}
          onPrint={() => printCard("muestra")}
          isPrintTarget={printTarget === "muestra"}
        />

        <aside className="qr-sidebar">
          <article className="qr-info-card">
            <div className="qr-info-card-head">
              <p className="qr-eyebrow">Vista previa</p>
              <h3>
                {selectedMuestraData
                  ? selectedMuestraData.referencia
                  : "Sin muestra seleccionada"}
              </h3>
            </div>

            {selectedMuestraData ? (
              <dl className="qr-meta-grid">
                {[
                  ["Modelo", selectedMuestraData.modelo || "Sin modelo"],
                  [
                    "Cliente",
                    clientesMap[selectedMuestraData.clienteid] || "-",
                  ],
                  [
                    "Ubicacion",
                    ubicacionesMap[selectedMuestraData.ubicacionid] || "-",
                  ],
                  ["Estado", selectedMuestraData.estado || "-"],
                  ["Pares", selectedMuestraData.pareselaborados ?? 0],
                  ["Licenciado", selectedMuestraData.licenciado ? "Si" : "No"],
                ].map(([label, value]) => (
                  <div key={label} className="qr-meta-item">
                    <dt>{label}</dt>
                    <dd>{String(value || "-")}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted-text">
                El resumen de la muestra aparecerá aquí cuando selecciones un
                registro.
              </p>
            )}
          </article>

          {selectedMuestraData ? (
            <article className="qr-info-card">
              <div className="qr-info-card-head">
                <p className="qr-eyebrow">Datos incluidos</p>
                <h3>Ficha completa dentro del QR</h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Referencia", selectedMuestraData.referencia],
                  ["Modelo", selectedMuestraData.modelo || "Sin modelo"],
                  ["Cliente", clientesMap[selectedMuestraData.clienteid] || ""],
                  [
                    "Molderia",
                    molderiasMap[selectedMuestraData.molderiaid] || "",
                  ],
                  [
                    "Ubicacion",
                    ubicacionesMap[selectedMuestraData.ubicacionid] || "",
                  ],
                  [
                    "Disenador",
                    usuariosMap[selectedMuestraData.disenadorid] || "",
                  ],
                  ["Segmento", selectedMuestraData.segmento || ""],
                  ["Estado", selectedMuestraData.estado || ""],
                  ["Pares", selectedMuestraData.pareselaborados ?? 0],
                  [
                    "Fecha elaboracion",
                    selectedMuestraData.fechaelaboracion || "",
                  ],
                  ["DIMA", selectedMuestraData.dima || ""],
                  ["Talla", selectedMuestraData.talla || ""],
                  ["Proceso", selectedMuestraData.proceso || ""],
                  ["Licenciado", selectedMuestraData.licenciado ? "Si" : "No"],
                  ["Observaciones", selectedMuestraData.observaciones || ""],
                ].map(([label, value]) => (
                  <div key={label} className="qr-meta-item">
                    <dt>{label}</dt>
                    <dd>{String(value || "-")}</dd>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          <article className="qr-info-card qr-scanner-card">
            <div className="qr-info-card-head">
              <p className="qr-eyebrow">Lectura</p>
              <h3>Escaneo del QR general</h3>
            </div>
            <p className="muted-text">
              Usa la camara para leer el QR completo de la muestra y recuperar
              su referencia.
            </p>
            <video ref={videoRef} className="scanner-video" muted />
            <div className="button-row qr-actions-row">
              {!scannerActive ? (
                <button
                  type="button"
                  className="primary-btn"
                  onClick={startScanner}
                >
                  Iniciar escaneo
                </button>
              ) : (
                <button
                  type="button"
                  className="danger-btn"
                  onClick={stopScanner}
                >
                  Detener
                </button>
              )}
            </div>
            {scanResult && (
              <p className="muted-text">Resultado: {scanResult}</p>
            )}
            {scanData && scanData.type === "muestra" ? (
              <pre className="qr-payload-preview">
                {JSON.stringify(scanData, null, 2)}
              </pre>
            ) : null}
            {scanError && <p className="error-text">{scanError}</p>}
          </article>
        </aside>
      </div>
    </section>
  );
};
