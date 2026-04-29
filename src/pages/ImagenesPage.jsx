import { useEffect, useMemo, useRef, useState } from "react";
import { api, API_ROOT_URL } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { useCrud } from "../hooks/useCrud";
import { toDateInput } from "../utils/format";
import { FiArrowDown, FiArrowUp, FiUploadCloud } from "react-icons/fi";

const labelClassName =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const controlWrapClassName =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-200 focus-within:border-[#1B3D8F] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(27,61,143,0.10)]";
const controlClassName =
  "w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400";

const sortByOrden = (items) =>
  [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

export const ImagenesPage = () => {
  const muestras = useCrud(ENDPOINTS.muestras);

  const [selectedMuestraId, setSelectedMuestraId] = useState("");
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [uploadForm, setUploadForm] = useState({
    origen: "archivo",
    fechacarga: toDateInput(new Date()),
  });

  useEffect(() => {
    muestras.load();
  }, []);

  useEffect(() => {
    if (!selectedMuestraId && muestras.items.length) {
      setSelectedMuestraId(muestras.items[0].id);
    }
  }, [muestras.items, selectedMuestraId]);

  const loadPhotos = async (muestraid) => {
    if (!muestraid) return;
    setLoading(true);
    setError("");

    try {
      const data = await api.get(`${ENDPOINTS.fotos}?muestraid=${muestraid}`);
      setPhotos(Array.isArray(data) ? sortByOrden(data) : []);
    } catch (err) {
      setError(err?.message || "No se pudieron cargar las fotos");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos(selectedMuestraId);
  }, [selectedMuestraId]);

  const selectedMuestra = useMemo(
    () => muestras.items.find((m) => m.id === selectedMuestraId),
    [muestras.items, selectedMuestraId],
  );

  const persistReorder = async (ordered) => {
    if (!selectedMuestraId) return;

    const orderedIds = ordered.map((p) => p.id);
    const updated = await api.patch(`${ENDPOINTS.fotos}/reordenar`, {
      muestraid: selectedMuestraId,
      orderedIds,
    });

    setPhotos(Array.isArray(updated) ? sortByOrden(updated) : ordered);
  };

  const movePhoto = async (id, direction) => {
    const current = sortByOrden(photos);
    const index = current.findIndex((p) => p.id === id);
    if (index < 0) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= current.length) return;

    const next = [...current];
    const tmp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = tmp;

    setPhotos(next);

    try {
      await persistReorder(next);
    } catch (err) {
      setError(err?.message || "No se pudo reordenar");
      await loadPhotos(selectedMuestraId);
    }
  };

  const onUpload = async (event) => {
    event.preventDefault();
    if (!selectedMuestraId) {
      setError("Selecciona una muestra");
      return;
    }

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo de imagen");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("muestraid", selectedMuestraId);
      formData.append("origen", uploadForm.origen);
      formData.append("fechacarga", uploadForm.fechacarga);

      await api.postForm(`${ENDPOINTS.fotos}/upload`, formData);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      await loadPhotos(selectedMuestraId);
    } catch (err) {
      setError(err?.message || "No se pudo subir la foto");
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      key: "preview",
      label: "Preview",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={`${API_ROOT_URL}${row.urlarchivo}`}
            alt={`Foto ${row.id}`}
            className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
            loading="lazy"
          />
          <div>
            <div className="text-sm font-semibold text-slate-800">
              Orden #{row.orden ?? 0}
            </div>
            <div className="text-xs text-slate-500">{row.origen}</div>
          </div>
        </div>
      ),
    },
    {
      key: "fechacarga",
      label: "Fecha",
      render: (row) =>
        row.fechacarga ? String(row.fechacarga).slice(0, 10) : "",
    },
    {
      key: "urlarchivo",
      label: "Archivo",
      render: (row) => (
        <a
          className="text-sm font-semibold text-[#1B3D8F] hover:underline"
          href={`${API_ROOT_URL}${row.urlarchivo}`}
          target="_blank"
          rel="noreferrer"
        >
          Ver
        </a>
      ),
    },
    {
      key: "ordenActions",
      label: "Orden",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="ghost-btn"
            onClick={() => movePhoto(row.id, -1)}
            title="Subir"
          >
            <FiArrowUp />
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => movePhoto(row.id, 1)}
            title="Bajar"
          >
            <FiArrowDown />
          </button>
        </div>
      ),
    },
  ];

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Imagenes</h1>
          <p>Sube y reordena fotografias por muestra.</p>
        </div>
      </header>

      <article className="panel-card">
        <div className="form-grid two-columns">
          <div className="full-width">
            <label className={labelClassName} htmlFor="img-muestra">
              Muestra
            </label>
            <div className={controlWrapClassName}>
              <select
                id="img-muestra"
                value={selectedMuestraId}
                onChange={(e) => setSelectedMuestraId(e.target.value)}
                className={controlClassName}
              >
                {muestras.items.length === 0 && (
                  <option value="">No hay muestras</option>
                )}
                {muestras.items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.referencia} · {m.modelo}
                  </option>
                ))}
              </select>
            </div>
            {selectedMuestra && (
              <p className="mt-2 text-sm text-slate-500">
                Seleccion actual: <span className="font-semibold">{selectedMuestra.referencia}</span>
              </p>
            )}
          </div>

          <div className="full-width">
            <h3 className="mb-2">Subir foto</h3>
            <form onSubmit={onUpload} className="form-grid two-columns">
              <div className="full-width">
                <label className={labelClassName} htmlFor="img-file">
                  Archivo
                </label>
                <div className={controlWrapClassName}>
                  <input
                    id="img-file"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className={controlClassName}
                  />
                </div>
              </div>

              <div>
                <label className={labelClassName} htmlFor="img-origen">
                  Origen
                </label>
                <div className={controlWrapClassName}>
                  <select
                    id="img-origen"
                    value={uploadForm.origen}
                    onChange={(e) =>
                      setUploadForm((prev) => ({ ...prev, origen: e.target.value }))
                    }
                    className={controlClassName}
                  >
                    <option value="archivo">archivo</option>
                    <option value="camara">camara</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClassName} htmlFor="img-fecha">
                  Fecha carga
                </label>
                <div className={controlWrapClassName}>
                  <input
                    id="img-fecha"
                    type="date"
                    value={uploadForm.fechacarga}
                    onChange={(e) =>
                      setUploadForm((prev) => ({ ...prev, fechacarga: e.target.value }))
                    }
                    className={controlClassName}
                  />
                </div>
              </div>

              <div className="form-actions full-width">
                <button type="submit" className="primary-btn" disabled={uploading}>
                  <FiUploadCloud /> {uploading ? "Subiendo..." : "Subir"}
                </button>
              </div>
            </form>
            {error && <p className="error-text">{error}</p>}
          </div>
        </div>
      </article>

      <article className="panel-card">
        <h3 className="mb-3">Fotos</h3>
        {loading ? (
          <p className="muted-text">Cargando...</p>
        ) : (
          <DataGrid
            columns={columns}
            rows={sortByOrden(photos)}
            minWidthClass="min-w-full"
            containerClassName="shadow-none"
          />
        )}
      </article>
    </section>
  );
};
