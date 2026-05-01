import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, API_ROOT_URL } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import {
  FiChevronsLeft, FiChevronLeft, FiChevronRight, FiChevronsRight,
  FiAlertTriangle, FiSearch, FiPlus, FiFilter, FiX, FiEye, FiUserX,
  FiCamera, FiUploadCloud, FiTrash2,
} from "react-icons/fi";
import { buildPagination } from "../utils/pagination";

const PAGE_SIZE = 20;

const emptyForm = {
  referencia: "", segmento: "", pareselaborados: 0,
  fechaelaboracion: "", estado: "nueva", ubicacionid: "", molderiaid: "",
  clienteid: "", disenadorid: "", dima: "", licenciado: false,
  talla: "", proceso: "", observaciones: "",
};

const ESTADO_META = {
  nueva: { label: "Nueva", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pendiente: { label: "Pendiente", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  presentada: { label: "Presentada", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  aprobada: { label: "Aprobada", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rechazada: { label: "Rechazada", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  reutilizable: { label: "Reutilizable", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  dada_de_baja: { label: "Dada de baja", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};

/** Convierte cualquier valor a string seguro para React */
const safe = (val) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return val.nombre ?? val.label ?? JSON.stringify(val);
  return String(val) || "—";
};

const EstadoBadge = ({ estado }) => {
  const meta = ESTADO_META[estado?.toLowerCase()] ?? { label: estado || "—", cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
      {meta.label}
    </span>
  );
};

const FieldWrap = ({ label, children, full = false }) => (
  <label className={`flex flex-col gap-1.5 ${full ? "col-span-full" : ""}`}>
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
    {children}
  </label>
);

const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1B3D8F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400";

const toCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const StatChip = ({ label, value, accent }) => (
  <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold backdrop-blur ${accent ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/8 text-white/80"}`}>
    <span className="text-white/60 text-xs font-medium">{label}</span>
    <span className="font-black text-white">{value}</span>
  </div>
);

export const MuestrasPage = () => {
  const catalogs = useCatalogData();
  const muestras = useCrud(ENDPOINTS.muestras);
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [filters, setFilters] = useState({
    q: "", estado: "", segmento: "", clienteid: "", ubicacionid: "",
    licenciado: "", dima: "", molderiaid: "", disenadorid: "", from: "", to: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [presentaciones, setPresentaciones] = useState([]);
  const [loadingPres, setLoadingPres] = useState(false);
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);

  // ── Fotos / Cámara en modal edición ──
  const [editPhotos, setEditPhotos] = useState([]);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [loadingEditPhotos, setLoadingEditPhotos] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const photoFileRef = useRef(null);

  // ── Fotos en modal detalle ──
  const [viewPhotos, setViewPhotos] = useState([]);
  const [loadingViewPhotos, setLoadingViewPhotos] = useState(false);

  const fetchRows = useCallback(async (activeFilters, activePage) => {
    setLoadingRows(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      params.set("page", activePage);
      params.set("limit", PAGE_SIZE);
      const q = activeFilters.q.trim();
      if (q) params.set("referencia", q);
      if (activeFilters.estado) params.set("estado", activeFilters.estado);
      if (activeFilters.segmento) params.set("segmento", activeFilters.segmento);
      if (activeFilters.clienteid) params.set("clienteid", activeFilters.clienteid);
      if (activeFilters.ubicacionid) params.set("ubicacionid", activeFilters.ubicacionid);
      if (activeFilters.molderiaid) params.set("molderiaid", activeFilters.molderiaid);
      if (activeFilters.disenadorid) params.set("disenadorid", activeFilters.disenadorid);
      if (activeFilters.licenciado !== "") params.set("licenciado", activeFilters.licenciado);
      if (activeFilters.dima) params.set("dima", activeFilters.dima);
      if (activeFilters.from) params.set("fechadesde", activeFilters.from);
      if (activeFilters.to) params.set("fechahasta", activeFilters.to);
      const payload = await api.get(`${ENDPOINTS.muestras}?${params.toString()}`);
      const data = toCollection(payload);
      const total = payload?.total ?? payload?.count ?? data.length;
      setRows(data);
      setTotalItems(typeof total === "number" ? total : data.length);
    } catch (err) {
      setFetchError(err.message || "Error cargando muestras");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchRows(filters, 1); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchRows]);

  useEffect(() => { fetchRows(filters, page); }, [page]); // eslint-disable-line

  const designerOptions = useMemo(() => {
    const ids = new Set(rows.map((i) => i.disenadorid).filter(Boolean));
    return Array.from(ids);
  }, [rows]);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const startIndex = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, totalItems);
  const { safePage, safeTotal, buttons } = buildPagination({ page, totalPages, maxButtons: 8 });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({
    q: "", estado: "", segmento: "", clienteid: "", ubicacionid: "",
    licenciado: "", dima: "", molderiaid: "", disenadorid: "", from: "", to: "",
  });

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const resetAndClose = () => {
    stopCamera();
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setEditPhotos([]);
    setPendingPhotos([]);
  };

  const openCreate = () => { 
    setEditing(null); 
    setForm(emptyForm); 
    setEditPhotos([]); 
    setPendingPhotos([]); 
    setModalOpen(true); 
  };

  const loadEditPhotos = async (muestraId) => {
    setLoadingEditPhotos(true);
    try {
      const data = await api.get(`${ENDPOINTS.fotos}?muestraid=${muestraId}`);
      setEditPhotos(Array.isArray(data) ? data : []);
    } catch {
      setEditPhotos([]);
    } finally {
      setLoadingEditPhotos(false);
    }
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ 
      ...row, 
      estado: row.estado?.toLowerCase() || "nueva",
      fechaelaboracion: toDateInput(row.fechaelaboracion) 
    });
    setModalOpen(true);
    setEditPhotos([]);
    setPendingPhotos([]);
    loadEditPhotos(row.id);
  };

  const handlePhotoFileUpload = async (file) => {
    if (!file) return;

    if (!editing) {
      // Modo creación: guardar en memoria
      const isDuplicate = pendingPhotos.some((p) => p.name === file.name && p.size === file.size);
      if (isDuplicate) {
        alert(`La imagen "${file.name}" ya fue agregada.`);
        if (photoFileRef.current) photoFileRef.current.value = "";
        return;
      }
      setPendingPhotos((prev) => [...prev, file]);
      if (photoFileRef.current) photoFileRef.current.value = "";
      return;
    }

    // Modo edición: subir directo
    const isDuplicate = editPhotos.some((p) => {
      const existingName = p.urlarchivo?.split("/").pop() ?? "";
      return existingName.endsWith(file.name.split("/").pop());
    });
    if (isDuplicate) {
      alert(`La imagen "${file.name}" ya fue subida para esta muestra.`);
      if (photoFileRef.current) photoFileRef.current.value = "";
      return;
    }

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("muestraid", editing.id);
      fd.append("origen", "archivo");
      fd.append("fechacarga", new Date().toISOString().slice(0, 10));
      await api.postForm(`${ENDPOINTS.fotos}/upload`, fd);
      await loadEditPhotos(editing.id);
    } catch (err) {
      console.error("Error subiendo foto:", err);
    } finally {
      setUploadingPhoto(false);
      if (photoFileRef.current) photoFileRef.current.value = "";
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      await api.delete(`${ENDPOINTS.fotos}/${photoId}`);
      setEditPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error("Error eliminando foto:", err);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, audio: false,
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 80);
    } catch {
      alert("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  };

  const handleCameraCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camara-${Date.now()}.png`, { type: "image/png" });
      handlePhotoFileUpload(file);
      stopCamera();
    }, "image/png");
  };

  const removePendingPhoto = (index) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...form,
        pareselaborados: toNumber(form.pareselaborados) || 0,
        talla: toNumber(form.talla),
        licenciado: Boolean(form.licenciado),
      };

      if (editing) {
        await muestras.update(editing.id, payload);
      } else {
        const newMuestra = await muestras.create(payload);
        
        // Subir fotos pendientes si hay
        if (pendingPhotos.length > 0 && newMuestra?.id) {
          for (const file of pendingPhotos) {
            try {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("muestraid", newMuestra.id);
              fd.append("origen", "archivo");
              fd.append("fechacarga", new Date().toISOString().slice(0, 10));
              await api.postForm(`${ENDPOINTS.fotos}/upload`, fd);
            } catch (err) {
              console.error("Error subiendo foto post-creación:", err);
            }
          }
        }
      }
      resetAndClose();
      fetchRows(filters, page);
    } catch (err) {
      alert(err.message || "Error al guardar");
    }
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    await muestras.remove(rowToDelete.id);
    setRowToDelete(null);
    fetchRows(filters, page);
  };
  const openView = async (row) => {
    setViewRow(row);
    setPresentaciones([]);
    setViewPhotos([]);
    setLoadingPres(true);
    setLoadingViewPhotos(true);
    try {
      const [presData, fotosData] = await Promise.all([
        api.get(`${ENDPOINTS.muestras}/${row.id}/presentaciones`),
        api.get(`${ENDPOINTS.fotos}?muestraid=${row.id}`),
      ]);
      setPresentaciones(Array.isArray(presData) ? presData : []);
      setViewPhotos(Array.isArray(fotosData) ? fotosData : []);
    } catch {
      setPresentaciones([]);
      setViewPhotos([]);
    } finally {
      setLoadingPres(false);
      setLoadingViewPhotos(false);
    }
  };

  const columns = [
    { key: "referencia", label: "Referencia" },
    { key: "segmento", label: "Segmento" },
    {
      key: "molderiaid",
      label: "Moldería",
      render: (row) =>
        typeof row.molderia === "object"
          ? row.molderia.nombre
          : row.molderia
    },
    {
      key: "estado", label: "Estado",
      render: (row) => <EstadoBadge estado={row.estado} />,
    },
    {
      key: "clienteid", label: "Cliente",
      render: (row) => safe(catalogs.clientesMap?.[row.clienteid] ?? row.clienteid),
    },
    {
      key: "ubicacionid", label: "Ubicación",
      render: (row) => safe(catalogs.ubicacionesMap?.[row.ubicacionid] ?? row.ubicacionid),
    },
    {
      key: "disenadorid", label: "Diseñador",
      render: (row) => {
        if (typeof row.disenador === "object" && row.disenador?.nombre) return row.disenador.nombre;
        if (typeof row.disenador === "string" && row.disenador.trim() !== "") return row.disenador;
        return safe(catalogs.disenadoresMap?.[row.disenadorid] ?? row.disenadorid);
      }
    },
    {
      key: "_ver", label: "",
      render: (row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B3D8F]/20 bg-[#eef2ff] px-2.5 py-1.5 text-xs font-semibold text-[#1B3D8F] transition hover:bg-[#1B3D8F] hover:text-white"
        >
          <FiEye className="h-3.5 w-3.5" />
          Ver
        </button>
      ),
    },
  ];

  const countByEstado = (e) => rows.filter((r) => r.estado === e).length;

  return (
    <section className="space-y-5">
      {/* ── HERO ── */}
      <header className="px-1 py-4 border-b border-slate-200">
  <div className="flex flex-col items-center text-center gap-2">
    
    <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
      Gestión de muestras
    </h1>

    <p className="text-sm text-slate-500 max-w-lg">
      Registro, actualización y clasificación operativa de todas las muestras.
    </p>

  </div>
</header>

      {/* ── BÚSQUEDA ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#1B3D8F] focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400"
            placeholder="Buscar por referencia o modelo..."
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </div>
        <button
          type="button" onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${showFilters || activeFilterCount > 0
              ? "border-[#1B3D8F] bg-[#1B3D8F] text-white shadow-[0_4px_14px_rgba(27,61,143,0.25)]"
              : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300"
            }`}
        >
          <FiFilter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#1B3D8F]">
              {activeFilterCount}
            </span>
          )}
        </button>
             <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163272] shadow-sm active:scale-[0.98]"
            >
              <FiPlus className="h-4 w-4" />
              Nueva muestra
            </button>
        {activeFilterCount > 0 && (
          <button
            type="button" onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <FiX className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      {/* ── FILTROS AVANZADOS ── */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Filtros avanzados
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className={inputCls} placeholder="Segmento"
              value={filters.segmento}
              onChange={(e) => setFilters((p) => ({ ...p, segmento: e.target.value }))}
            />
            <select className={inputCls} value={filters.estado} onChange={(e) => setFilters((p) => ({ ...p, estado: e.target.value }))}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_META).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select className={inputCls} value={filters.clienteid} onChange={(e) => setFilters((p) => ({ ...p, clienteid: e.target.value }))}>
              <option value="">Todos los clientes</option>
              {catalogs.clientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
            <select className={inputCls} value={filters.molderiaid} onChange={(e) => setFilters((p) => ({ ...p, molderiaid: e.target.value }))}>
              <option value="">Todas las molderías</option>
              {catalogs.molderias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
            <select className={inputCls} value={filters.ubicacionid} onChange={(e) => setFilters((p) => ({ ...p, ubicacionid: e.target.value }))}>
              <option value="">Todas las ubicaciones</option>
              {catalogs.ubicaciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </select>
            <select className={inputCls} value={filters.disenadorid} onChange={(e) => setFilters((p) => ({ ...p, disenadorid: e.target.value }))}>
              <option value="">Todos los diseñadores</option>
              {catalogs.disenadores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <select className={inputCls} value={filters.licenciado} onChange={(e) => setFilters((p) => ({ ...p, licenciado: e.target.value }))}>
              <option value="">Licencia (todas)</option>
              <option value="true">Licenciado</option>
              <option value="false">No licenciado</option>
            </select>
            <input
              className={inputCls} placeholder="DIMA"
              value={filters.dima}
              onChange={(e) => setFilters((p) => ({ ...p, dima: e.target.value }))}
            />
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
              <input type="date" className={inputCls} value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* ── ESTADOS ── */}
      {loadingRows && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
          Cargando muestras...
        </div>
      )}
      {fetchError && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <FiAlertTriangle className="h-4 w-4 shrink-0" />
          {fetchError}
        </div>
      )}

      {/* ── TABLA ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <p className="text-sm font-semibold text-slate-600">
            {totalItems === 0 ? "Sin resultados" : `${startIndex}–${endIndex} de ${totalItems} muestras`}
          </p>
          {loadingRows && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-slate-500 text-xs">Total</span>
            <span className="font-bold text-[#1B3D8F]">{totalItems}</span>
          </div>
        </div>
        <DataGrid
          columns={columns} rows={rows}
          onEdit={openEdit} onDelete={(row) => setRowToDelete(row)}
          minWidthClass="min-w-full"
          containerClassName="shadow-none rounded-none border-0"
        />
        {safeTotal > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 px-5 py-3.5">
            <button type="button" className="ghost-btn" disabled={safePage <= 1} onClick={() => setPage(1)}><FiChevronsLeft /></button>
            <button type="button" className="ghost-btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><FiChevronLeft /></button>
            {buttons.map((item) =>
              typeof item === "string" ? (
                <span key={item} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={item} type="button" onClick={() => setPage(item)}
                  className={item === safePage
                    ? "rounded-xl bg-[#1B3D8F] px-3 py-2 text-sm font-bold text-white"
                    : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                  aria-current={item === safePage ? "page" : undefined}
                >{item}</button>
              )
            )}
            <button type="button" className="ghost-btn" disabled={safePage >= safeTotal} onClick={() => setPage((p) => Math.min(safeTotal, p + 1))}><FiChevronRight /></button>
            <button type="button" className="ghost-btn" disabled={safePage >= safeTotal} onClick={() => setPage(safeTotal)}><FiChevronsRight /></button>
          </div>
        )}
      </div>

      {/* ── MODAL ELIMINAR ── */}
      {rowToDelete && (
        <Modal title="Confirmar eliminación" onClose={() => setRowToDelete(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <div>
                <p className="m-0 font-semibold">Esta acción no se puede deshacer.</p>
                <p className="m-0 text-sm text-rose-600">Se eliminará la muestra <strong>{rowToDelete.referencia}</strong>.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" className="ghost-btn" onClick={() => setRowToDelete(null)}>Cancelar</button>
              <button type="button" onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]">
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {modalOpen && (
        <Modal title={editing ? "Editar muestra" : "Nueva muestra"} onClose={resetAndClose}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <FieldWrap label="Referencia">
              <input className={inputCls} required value={form.referencia || ""} onChange={(e) => onChange("referencia", e.target.value)} placeholder="Ej: REF-001" />
            </FieldWrap>
            <FieldWrap label="Segmento">
              <input className={inputCls} required value={form.segmento || ""} onChange={(e) => onChange("segmento", e.target.value)} placeholder="Ej: Dama, Caballero..." />
            </FieldWrap>
            <FieldWrap label="DIMA">
              <input className={inputCls} value={form.dima || ""} onChange={(e) => onChange("dima", e.target.value)} placeholder="Código DIMA" />
            </FieldWrap>
            <FieldWrap label="Pares elaborados">
              <input className={inputCls} required type="number" min="0" value={form.pareselaborados ?? 0} onChange={(e) => onChange("pareselaborados", e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Talla">
              <input className={inputCls} type="number" min="0" value={form.talla || ""} onChange={(e) => onChange("talla", e.target.value)} placeholder="Talla base" />
            </FieldWrap>
            <FieldWrap label="Fecha de elaboración">
              <input className={inputCls} required type="date" value={toDateInput(form.fechaelaboracion)} onChange={(e) => onChange("fechaelaboracion", e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Estado">
              <select className={inputCls} value={form.estado || "nueva"} onChange={(e) => onChange("estado", e.target.value)}>
                {Object.entries(ESTADO_META).map(([val, { label }]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </FieldWrap>
            <FieldWrap label="Cliente">
              <select className={inputCls} required value={form.clienteid || ""} onChange={(e) => onChange("clienteid", e.target.value)}>
                <option value="">Selecciona un cliente</option>
                {catalogs.clientes.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Moldería">
              <select className={inputCls} required value={form.molderiaid || ""} onChange={async (e) => {
                if (e.target.value === "NEW") {
                  const nombre = window.prompt("Nombre de la nueva moldería:");
                  if (!nombre) return;
                  try {
                    const created = await api.post(ENDPOINTS.molderias, { nombre, tipohorma: "Pendiente", talon: "Pendiente", punta: "Pendiente", esnueva: true });
                    await catalogs.load();
                    onChange("molderiaid", created.id);
                  } catch (err) {
                    alert(err.message || "Error creando moldería");
                  }
                  return;
                }
                onChange("molderiaid", e.target.value);
              }}>
                <option value="">Selecciona moldería</option>
                <option value="NEW" className="font-bold text-[#1B3D8F]">+ Crear nueva moldería</option>
                {catalogs.molderias.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Ubicación">
              <select className={inputCls} required value={form.ubicacionid || ""} onChange={(e) => onChange("ubicacionid", e.target.value)}>
                <option value="">Selecciona ubicación</option>
                {catalogs.ubicaciones.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Diseñador">
              <select className={inputCls} required value={form.disenadorid || ""} onChange={(e) => onChange("disenadorid", e.target.value)}>
                <option value="">Selecciona diseñador</option>
                {catalogs.disenadores.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </FieldWrap>
            <FieldWrap label="Proceso">
              <input className={inputCls} value={form.proceso || ""} onChange={(e) => onChange("proceso", e.target.value)} placeholder="Proceso productivo" />
            </FieldWrap>
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="licenciado-check" type="checkbox"
                checked={Boolean(form.licenciado)}
                onChange={(e) => onChange("licenciado", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F] focus:ring-[#1B3D8F]"
              />
              <label htmlFor="licenciado-check" className="text-sm font-semibold text-slate-700">Licenciado</label>
            </div>
            <FieldWrap label="Observaciones" full>
              <textarea className={inputCls} rows="3" value={form.observaciones || ""} onChange={(e) => onChange("observaciones", e.target.value)} placeholder="Notas adicionales..." />
            </FieldWrap>

            {/* ── FOTOS — visible al editar y crear ── */}
            <div className="col-span-full space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              {/* Cabecera */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Fotos de la muestra
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="file" accept="image/*" className="hidden" ref={photoFileRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handlePhotoFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <button type="button" onClick={() => photoFileRef.current?.click()} disabled={uploadingPhoto} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
                    <FiUploadCloud className="h-3.5 w-3.5" /> Subir archivo
                  </button>
                  <button type="button" onClick={startCamera} disabled={uploadingPhoto || cameraOpen} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D8F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#163272] disabled:opacity-50">
                    <FiCamera className="h-3.5 w-3.5" /> Usar cámara
                  </button>
                </div>
              </div>

              {/* Grid de fotos subidas (edición) */}
              {editing && editPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {editPhotos.map((p) => (
                    <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <img src={`${API_ROOT_URL}${p.urlarchivo}`} alt="Muestra" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                        <button type="button" onClick={() => deletePhoto(p.id)} className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition">
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Grid de fotos pendientes (creación) */}
              {!editing && pendingPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {pendingPhotos.map((f, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <img src={URL.createObjectURL(f)} alt="Pendiente" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                        <button type="button" onClick={() => removePendingPhoto(i)} className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition">
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur">Por subir</span>
                    </div>
                  ))}
                </div>
              )}

              {uploadingPhoto && (
                <p className="text-center text-xs font-semibold text-[#1B3D8F] animate-pulse">
                  Subiendo foto...
                </p>
              )}

              {/* UI Cámara */}
              {cameraOpen && (
                <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-black">
                  <video ref={videoRef} autoPlay playsInline className="h-[300px] w-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button type="button" onClick={stopCamera} className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20">
                      <FiX className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={handleCameraCapture} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1B3D8F] shadow-lg hover:scale-105 transition">
                      <FiCamera className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-full flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button type="button" className="ghost-btn" onClick={resetAndClose}>Cancelar</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163272] active:scale-[0.98]">
                {editing ? "Guardar cambios" : "Crear muestra"}
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* ── MODAL DETALLE ── */}
      {viewRow && (
        <Modal title={`Detalle — ${viewRow.referencia}`} onClose={() => setViewRow(null)}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                { label: "Referencia", value: viewRow.referencia },
                { label: "Segmento", value: viewRow.segmento },
                { label: "Estado", value: <EstadoBadge estado={viewRow.estado} /> },
                { label: "Moldería", value: safe(catalogs.molderiasMap?.[viewRow.molderiaid] ?? viewRow.molderia) },
                { label: "Pares elaborados", value: viewRow.pareselaborados },
                { label: "Fecha elaboración", value: viewRow.fechaelaboracion?.slice(0, 10) },
                { label: "Cliente", value: safe(catalogs.clientesMap?.[viewRow.clienteid] ?? viewRow.clienteid) },
                { label: "Ubicación", value: safe(catalogs.ubicacionesMap?.[viewRow.ubicacionid] ?? viewRow.ubicacionid) },
                { 
                  label: "Diseñador", 
                  value: typeof viewRow.disenador === "object" && viewRow.disenador?.nombre 
                    ? viewRow.disenador.nombre 
                    : typeof viewRow.disenador === "string" && viewRow.disenador.trim() !== ""
                      ? viewRow.disenador
                      : safe(catalogs.disenadoresMap?.[viewRow.disenadorid] ?? viewRow.disenadorid) 
                },
                { label: "Licenciado", value: viewRow.licenciado ? "Sí" : "No" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{value ?? "—"}</div>
                </div>
              ))}
            </div>

            {/* Presentaciones */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Presentaciones</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B3D8F] text-[10px] font-black text-white">
                  {presentaciones.length}
                </span>
              </div>
              {loadingPres ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
                  Cargando...
                </div>
              ) : presentaciones.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
                  <FiEye className="h-7 w-7 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-400">Sin presentaciones registradas</p>
                  <p className="text-xs text-slate-400">Esta muestra aún no ha sido presentada.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {presentaciones.map((p) => (
                    <div key={p.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {p.cliente?.nombre || safe(catalogs.clientesMap?.[p.clienteid]) || "Cliente desconocido"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {p.cliente?.region ? `Región: ${p.cliente.region} · ` : ""}
                            Fecha: {p.fecha?.slice(0, 10) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${p.resultado === "aprobada"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}>
                            {p.resultado}
                          </span>
                          {p.derivoproduccion && (
                            <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                              Derivó a producción
                            </span>
                          )}
                        </div>
                      </div>
                      {(p.paresaprobados || p.paresrechazados) && (
                        <div className="mt-2 flex gap-4 text-xs text-slate-500">
                          {p.paresaprobados && <span>✓ {p.paresaprobados} aprobados</span>}
                          {p.paresrechazados && <span>✗ {p.paresrechazados} rechazados</span>}
                        </div>
                      )}
                      {p.observaciones && <p className="mt-2 text-xs text-slate-500">{p.observaciones}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clientes sin presentación */}
            {!loadingPres && catalogs.clientes.length > 0 && (() => {
              const presentadosIds = new Set(presentaciones.map((p) => p.clienteid));
              const noPresentados = catalogs.clientes.filter((c) => !presentadosIds.has(c.id));
              return (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Clientes sin presentación</h3>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${noPresentados.length === 0 ? "bg-emerald-500" : "bg-amber-500"}`}>
                      {noPresentados.length}
                    </span>
                  </div>
                  {noPresentados.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <span className="text-emerald-600">✓</span>
                      <p className="text-sm font-semibold text-emerald-700">Presentada a todos los clientes registrados.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {noPresentados.map((c) => (
                        <div key={c.id} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2">
                          <FiUserX className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-amber-800 leading-tight">{c.nombre}</p>
                            {c.region && <p className="text-[10px] text-amber-600 leading-tight">{c.region}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* ── Fotos ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Fotos</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B3D8F] text-[10px] font-black text-white">
                  {viewPhotos.length}
                </span>
              </div>
              {loadingViewPhotos ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
                  Cargando fotos...
                </div>
              ) : viewPhotos.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                  <FiCamera className="h-6 w-6 text-slate-300" />
                  <p className="text-xs font-medium text-slate-400">Sin fotos registradas para esta muestra.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {viewPhotos.map((photo) => (
                    <a
                      key={photo.id}
                      href={`${API_ROOT_URL}${photo.urlarchivo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={`${API_ROOT_URL}${photo.urlarchivo}`}
                        alt="Foto muestra"
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-end justify-start bg-gradient-to-t from-black/40 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                        <span className="text-[10px] font-semibold text-white">Ver</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

          </div>
        </Modal>
      )}
    </section>
  );
};