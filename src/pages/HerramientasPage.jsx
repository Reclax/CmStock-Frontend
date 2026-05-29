import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { ImportacionComponent } from "../components/ImportacionComponent";
import {
  FiUploadCloud,
  FiImage,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
//añadi la linea  de codigo para probar el pull request
// ── Helpers ──────────────────────────────────────────────────────────────────
const extractRef = (filename) => {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
  return nameWithoutExt.split(/\s+/)[0].trim().toUpperCase() || null;
};

const isImage = (file) => file.type.startsWith("image/");

// ── Sub-componente: Carga masiva de imágenes ─────────────────────────────────
const GestionImagenesBulk = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const images = Array.from(newFiles).filter(isImage);
    if (!images.length) return;
    setResults(null);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      const unique = images.filter((f) => !existing.has(f.name + f.size));
      return [...prev, ...unique];
    });
  };

  const removeFile = (index) =>
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onUpload = async () => {
    if (!selectedFiles.length) return;
    setUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      const data = await api.postForm(`${ENDPOINTS.fotos}/upload-bulk`, formData);
      setResults(data);
      setSelectedFiles([]);
    } catch (err) {
      setResults({
        vinculadas: 0,
        omitidas: selectedFiles.length,
        resultados: selectedFiles.map((f) => ({
          ok: false,
          archivo: f.name,
          referencia: extractRef(f.name),
          motivo: err?.message || "Error de conexión",
        })),
      });
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setResults(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Zona de carga ── */}
      <div
        className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 cursor-pointer
          ${dragOver
            ? "border-[#1B3D8F] bg-[#eef2ff] scale-[1.01]"
            : "border-slate-300 bg-slate-50 hover:border-[#1B3D8F] hover:bg-[#f5f7ff]"
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        aria-label="Zona de carga de imágenes"
      >
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${
            dragOver
              ? "bg-[#1B3D8F] text-white"
              : "bg-white text-[#1B3D8F] border border-slate-200"
          }`}
        >
          <FiUploadCloud className="h-7 w-7" />
        </div>
        <div>
          <p className="font-semibold text-slate-700">
            Arrastra tus imágenes aquí o{" "}
            <span className="text-[#1B3D8F] underline underline-offset-2">
              haz clic para seleccionar
            </span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            JPG, PNG, WEBP y otros formatos · El nombre debe empezar por la referencia
            <br />
            <span className="font-mono text-slate-500">D25-3753 FRONTAL.JPG</span>
            {" → referencia "}
            <span className="font-mono text-slate-500">D25-3753</span>
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* ── Lista de archivos seleccionados ── */}
      {selectedFiles.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">
              {selectedFiles.length} imagen{selectedFiles.length !== 1 ? "es" : ""} seleccionada
              {selectedFiles.length !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors"
            >
              Limpiar todo
            </button>
          </div>
          <ul className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {selectedFiles.map((file, i) => {
              const ref = extractRef(file.name);
              return (
                <li key={`${file.name}-${i}`} className="flex items-center gap-3 px-5 py-2.5">
                  <FiImage className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      Ref. detectada:{" "}
                      {ref ? (
                        <span className="font-mono font-semibold text-[#1B3D8F]">{ref}</span>
                      ) : (
                        <span className="text-rose-500">No detectada</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                    aria-label="Quitar archivo"
                  >
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 px-5 py-3">
            <button
              type="button"
              id="btn-upload-bulk"
              onClick={onUpload}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Subiendo...
                </>
              ) : (
                <>
                  <FiUploadCloud className="h-4 w-4" />
                  Cargar {selectedFiles.length} imagen{selectedFiles.length !== 1 ? "es" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Resultados ── */}
      {results && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Resumen */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <p className="text-sm font-bold text-slate-700">Resultado de la carga</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <FiCheckCircle className="h-3.5 w-3.5" />
              {results.vinculadas} vinculada{results.vinculadas !== 1 ? "s" : ""}
            </span>
            {results.omitidas > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                <FiAlertTriangle className="h-3.5 w-3.5" />
                {results.omitidas} omitida{results.omitidas !== 1 ? "s" : ""} — referencia no encontrada
              </span>
            )}
          </div>

          {/* Lista detalle */}
          <ul className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {results.resultados.map((r, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 px-5 py-3 ${r.ok ? "bg-white" : "bg-rose-50/40"}`}
              >
                {r.ok ? (
                  <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <FiXCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.archivo}</p>
                  {r.referencia && (
                    <p className="text-xs text-slate-500">
                      Ref:{" "}
                      <span className="font-mono font-semibold">{r.referencia}</span>
                    </p>
                  )}
                  {!r.ok && r.motivo && (
                    <p className="mt-0.5 text-xs font-medium text-rose-600">{r.motivo}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    r.ok ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {r.ok ? "Vinculada ✓" : "Omitida"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Página principal ──────────────────────────────────────────────────────────
export const HerramientasPage = () => {
  const catalogs = useCatalogData();
  const muestras = useCrud(ENDPOINTS.muestras);
  const [activeTab, setActiveTab] = useState("avanzada");
  const { load: loadMuestras } = muestras;

  // refs sin uso activo pero conservados para compatibilidad futura
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    loadMuestras();
  }, [loadMuestras]);

  const tabs = [
    { id: "avanzada", label: "Importación Avanzada" },
    { id: "imagenes", label: "Gestión de Imágenes" },
  ];

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Herramientas avanzadas
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Importación masiva de datos y gestión de fotografías de muestras.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-[#1B3D8F] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>



      {/* Tab: Importación Avanzada */}
      {activeTab === "avanzada" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ImportacionComponent onImportComplete={() => { loadMuestras(); }} />
        </div>
      )}

      {/* Tab: Gestión de Imágenes */}
      {activeTab === "imagenes" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-800">Importación masiva de imágenes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Sube múltiples fotos a la vez. Cada imagen se vincula automáticamente a la muestra
              cuya referencia coincida con el inicio del nombre del archivo.
              Si la referencia no existe, la foto se omite y se notifica.
            </p>
          </div>
          <GestionImagenesBulk />
        </div>
      )}
    </section>
  );
};
