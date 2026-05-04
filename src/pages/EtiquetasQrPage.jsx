import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiPrinter, FiCamera, FiXCircle, FiCheckCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
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
    nombre: catalogs.disenadoresMap[sample.disenadorid] || "",
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
          <div className="flex flex-col items-center text-center opacity-70">
            <FiInfo className="mb-3 h-8 w-8 text-[#1B3D8F]" />
            <p className="font-medium">Selecciona una muestra para generar la etiqueta.</p>
          </div>
        </div>
      )}

      <button
        type="button"
        className="secondary-btn qr-print-btn flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onPrint}
        disabled={!previewValue}
      >
        <FiPrinter className="h-4 w-4" />
        Imprimir etiqueta
      </button>
    </div>
  </article>
);

export const EtiquetasQrPage = () => {
  const muestras = useCrud(ENDPOINTS.muestras);
  const catalogs = useCatalogData();
  const { clientesMap, molderiasMap, ubicacionesMap, usuariosMap, disenadoresMap } = catalogs;
  const [activeTab, setActiveTab] = useState("escanear");
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
        disenadoresMap,
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
    disenadoresMap,
  ]);

  useEffect(() => {
    const clearPrintTarget = () => setPrintTarget("");
    window.addEventListener("afterprint", clearPrintTarget);
    return () => window.removeEventListener("afterprint", clearPrintTarget);
  }, []);

  useEffect(
    () => () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    },
    [],
  );

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
      setActiveTab("generar");
      return;
    }

    setScanError("El QR fue detectado, pero no se encontró la referencia.");
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
            Etiquetas QR
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Genera, imprime o escanea etiquetas QR para el control rápido y eficiente de las muestras.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto flex w-full max-w-[500px] gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {[
          { id: "generar", label: "Generador de QR", icon: FiPrinter },
          { id: "escanear", label: "Escanear Etiqueta", icon: FiCamera },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-[#1B3D8F] shadow-[0_2px_10px_rgba(27,61,143,0.06)] ring-1 ring-slate-200/50"
                : "text-slate-500 hover:bg-slate-100/50 hover:text-slate-700"
            }`}
          >
            <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? "text-[#1B3D8F]" : "opacity-70"}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "generar" && (
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
                      "Ubicación",
                      ubicacionesMap[selectedMuestraData.ubicacionid] || "-",
                    ],
                    ["Estado", selectedMuestraData.estado || "-"],
                    ["Pares", selectedMuestraData.pareselaborados ?? 0],
                    ["Licenciado", selectedMuestraData.licenciado ? "Sí" : "No"],
                  ].map(([label, value]) => (
                    <div key={label} className="qr-meta-item">
                      <dt>{label}</dt>
                      <dd>{String(value || "-")}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center opacity-60">
                  <FiInfo className="mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-500">
                    El resumen aparecerá aquí al seleccionar un registro.
                  </p>
                </div>
              )}
            </article>

            {selectedMuestraData && (
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
                      "Ubicación",
                      ubicacionesMap[selectedMuestraData.ubicacionid] || "",
                    ],
                    [
                      "Diseñador",
                      disenadoresMap[selectedMuestraData.disenadorid] || "",
                    ],
                    ["Segmento", selectedMuestraData.segmento || ""],
                    ["Estado", selectedMuestraData.estado || ""],
                    ["Pares", selectedMuestraData.pareselaborados ?? 0],
                    [
                      "Fecha elaboración",
                      selectedMuestraData.fechaelaboracion || "",
                    ],
                    ["DIMA", selectedMuestraData.dima || ""],
                    ["Talla", selectedMuestraData.talla || ""],
                    ["Proceso", selectedMuestraData.proceso || ""],
                    ["Licenciado", selectedMuestraData.licenciado ? "Sí" : "No"],
                    ["Observaciones", selectedMuestraData.observaciones || ""],
                  ].map(([label, value]) => (
                    <div key={label} className="qr-meta-item">
                      <dt>{label}</dt>
                      <dd>{String(value || "-")}</dd>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </aside>
        </div>
      )}

      {activeTab === "escanear" && (
        <div className="mx-auto w-full max-w-2xl">
          <article className="qr-info-card qr-scanner-card">
            <div className="qr-info-card-head">
              <p className="qr-eyebrow">Lectura de cámara</p>
              <h3>Escaneo del QR general</h3>
            </div>
            <p className="muted-text">
              Usa la cámara de tu dispositivo para leer el QR completo de la muestra.
              Al escanear un QR válido, serás redirigido automáticamente a la pestaña de generación.
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
                  Detener cámara
                </button>
              )}
            </div>
            {scanResult && (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-600">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                Última lectura: {scanResult}
              </p>
            )}
            {scanData && scanData.type === "muestra" ? (
              <pre className="qr-payload-preview mt-4">
                {JSON.stringify(scanData, null, 2)}
              </pre>
            ) : null}
            {scanError && (
              <p className="error-text mt-4 flex items-center gap-2">
                <FiAlertTriangle className="h-4 w-4 shrink-0" />
                {scanError}
              </p>
            )}
          </article>
        </div>
      )}
    </section>
  );
};
