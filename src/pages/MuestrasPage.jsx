import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEdit2,
  FiEye,
  FiFilter,
  FiPlus,
  FiPrinter,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import Select from "react-select";
import { api, API_ROOT_URL } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import { buildPagination } from "../utils/pagination";
import { generateQrDataUrl } from "../utils/qr";

const PAGE_SIZE = 20;

const emptyForm = {
  referencia: "",
  segmento: "",
  pareselaborados: 0,
  fechaelaboracion: "",
  estado: "nueva",
  ubicacionid: "",
  molderiaid: "",
  clienteid: "",
  disenadorid: "",
  dima: "",
  licenciado: false,
  talla: "",
  proceso: "",
  observaciones: "",
};

const ESTADO_META = {
  nueva: { label: "Nueva", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "no presentado": {
    label: "No presentado",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  presentada: {
    label: "Presentada",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
  aprobada: {
    label: "Aprobada",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rechazada: {
    label: "Rechazada",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  reutilizable: {
    label: "Reutilizable",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "dada de baja": {
    label: "Dada de baja",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

/** Convierte cualquier valor a string seguro para React */
const safe = (val) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object")
    return val.nombre ?? val.label ?? JSON.stringify(val);
  return String(val) || "—";
};

const esMuestraVariacion = (row) => {
  if (!row) return false;
  if (row.variacion === true) return true;
  return (
    String(row.estado || "")
      .trim()
      .toLowerCase() === "variacion"
  );
};

const formatearReferenciaVariacion = (row) => {
  if (!row) return "—";

  const referencia = String(row.referencia || "").trim();
  if (referencia) return referencia;

  const base = String(row.muestraOriginal?.referencia || "").trim();
  const numero = String(row.orden || "").trim();
  if (base && numero) {
    return `${base} ${numero}`;
  }

  return "—";
};

const EstadoBadge = ({ estado }) => {
  const meta = ESTADO_META[estado?.toLowerCase()] ?? {
    label: estado || "—",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

const FieldWrap = ({ label, children, full = false }) => (
  <label className={`flex flex-col gap-1.5 ${full ? "col-span-full" : ""}`}>
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1B3D8F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400";

const toCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const StatChip = ({ label, value, accent }) => (
  <div
    className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold backdrop-blur ${accent ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/8 text-white/80"}`}
  >
    <span className="text-white/60 text-xs font-medium">{label}</span>
    <span className="font-black text-white">{value}</span>
  </div>
);

export const MuestrasPage = () => {
  const catalogs = useCatalogData();
  const muestras = useCrud(ENDPOINTS.muestras);
  const variaciones = useCrud(ENDPOINTS.variaciones);
  const presentacionesCrud = useCrud(ENDPOINTS.presentaciones);
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    estado: "",
    segmento: "",
    clienteid: "",
    ubicacionid: "",
    licenciado: "",
    dima: "",
    molderia: "",
    molderiaid: "",
    disenadorid: "",
    mes: "",
    from: "",
    to: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [presentaciones, setPresentaciones] = useState([]);
  const [loadingPres, setLoadingPres] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrLink, setQrLink] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef(null);

  // ── Modal de Presentación (desde clientes sin presentación) ──
  const [presentacionModalOpen, setPresentacionModalOpen] = useState(false);
  const [presentacionForm, setPresentacionForm] = useState({
    muestraid: "",
    clienteid: "",
    fecha: "",
    resultado: "",
    paresaprobados: 0,
    paresrechazados: 0,
    derivoproduccion: false,
    observaciones: "",
  });
  const [savingPresentacion, setSavingPresentacion] = useState(false);

  // ── Modal de detalle / edición de una presentación existente ──
  const [editingPresentacion, setEditingPresentacion] = useState(null); // { ...presentacion }
  const [savingEditPres, setSavingEditPres] = useState(false);

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

  // ── Variaciones anexadas ──
  const [variacionesAnexadas, setVariacionesAnexadas] = useState([]);
  const [loadingVariaciones, setLoadingVariaciones] = useState(false);

  // ── Modal de Moldería ──
  const [molderiaPromptOpen, setMolderiaPromptOpen] = useState(false);
  const [newMolderiaName, setNewMolderiaName] = useState("");
  const [creatingMolderia, setCreatingMolderia] = useState(false);
  const [molderiaInputValue, setMolderiaInputValue] = useState("");

  // ── Estado de Guardado ──
  const [isSaving, setIsSaving] = useState(false);

  const [dbDimaValues, setDbDimaValues] = useState([]);
  const [dbProcesoValues, setDbProcesoValues] = useState([]);
  const [dbSegmentoValues, setDbSegmentoValues] = useState([]);

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
      if (activeFilters.segmento)
        params.set("segmento", activeFilters.segmento);
      if (activeFilters.clienteid)
        params.set("clienteid", activeFilters.clienteid);
      if (activeFilters.ubicacionid)
        params.set("ubicacionid", activeFilters.ubicacionid);
      // molderia: texto libre tiene prioridad; si no, usar ID exacto
      if (activeFilters.molderia)
        params.set("molderia", activeFilters.molderia);
      else if (activeFilters.molderiaid)
        params.set("molderiaid", activeFilters.molderiaid);
      if (activeFilters.disenadorid)
        params.set("disenadorid", activeFilters.disenadorid);
      if (activeFilters.licenciado !== "")
        params.set("licenciado", activeFilters.licenciado);
      if (activeFilters.dima) params.set("dima", activeFilters.dima);
      // Filtro por mes tiene prioridad sobre rango from/to
      if (activeFilters.mes) {
        params.set("mes", activeFilters.mes);
      } else {
        if (activeFilters.from) params.set("fechadesde", activeFilters.from);
        if (activeFilters.to) params.set("fechahasta", activeFilters.to);
      }
      const payload = await api.get(
        `${ENDPOINTS.muestras}?${params.toString()}`,
      );
      const data = toCollection(payload);
      // Filtrar para excluir variaciones de la tabla principal
      const filteredData = data.filter((row) => !esMuestraVariacion(row));
      const total = payload?.total ?? payload?.count ?? data.length;
      setRows(filteredData);
      setTotalItems(typeof total === "number" ? total : filteredData.length);
    } catch (err) {
      setFetchError(err.message || "Error cargando muestras");
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchRows(filters, 1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchRows]);

  useEffect(() => {
    fetchRows(filters, page);
  }, [page]); // eslint-disable-line

  const designerOptions = useMemo(() => {
    const ids = new Set(rows.map((i) => i.disenadorid).filter(Boolean));
    return Array.from(ids);
  }, [rows]);

  useEffect(() => {
    const loadDbOptions = async () => {
      try {
        const payload = await api.get(
          `${ENDPOINTS.muestras}?page=1&limit=5000`,
        );
        const data = toCollection(payload);
        const dimaSet = new Set();
        const procesoSet = new Set();
        const segmentoSet = new Set();
        data.forEach((row) => {
          if (row.dima) dimaSet.add(String(row.dima).trim());
          if (row.proceso) procesoSet.add(String(row.proceso).trim());
          if (row.segmento) segmentoSet.add(String(row.segmento).trim());
        });
        setDbDimaValues(Array.from(dimaSet).filter(Boolean));
        setDbProcesoValues(Array.from(procesoSet).filter(Boolean));
        setDbSegmentoValues(Array.from(segmentoSet).filter(Boolean));
      } catch {
        setDbDimaValues([]);
        setDbProcesoValues([]);
      }
    };

    loadDbOptions();
  }, []);

  const dimaOptions = useMemo(() => {
    const values = new Set();
    dbDimaValues.forEach((value) => values.add(String(value).trim()));
    rows.forEach((row) => {
      if (row.dima) values.add(String(row.dima).trim());
    });
    if (form.dima) values.add(String(form.dima).trim());
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [dbDimaValues, rows, form.dima]);

  const procesoOptions = useMemo(() => {
    const values = new Set();
    dbProcesoValues.forEach((value) => values.add(String(value).trim()));
    rows.forEach((row) => {
      if (row.proceso) values.add(String(row.proceso).trim());
    });
    if (form.proceso) values.add(String(form.proceso).trim());
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [dbProcesoValues, rows, form.proceso]);

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      borderRadius: "0.75rem",
      borderColor: state.isFocused ? "#1B3D8F" : "#e2e8f0",
      backgroundColor: "#f8fafc",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(27,61,143,0.08)" : "none",
      paddingLeft: "0.25rem",
    }),
    valueContainer: (base) => ({ ...base, padding: "0 0.5rem" }),
    input: (base) => ({ ...base, margin: 0, padding: 0 }),
    menuPortal: (base) => ({ ...base, zIndex: 60 }),
    menu: (base) => ({ ...base, zIndex: 60 }),
  };

  const clienteOptions = useMemo(
    () => catalogs.clientes.map((i) => ({ value: i.id, label: i.nombre })),
    [catalogs.clientes],
  );

  const molderiaOptions = useMemo(
    () => [
      { value: "__new__", label: "+ Crear nueva moldería" },
      ...catalogs.molderias.map((i) => ({ value: i.id, label: i.nombre })),
    ],
    [catalogs.molderias],
  );

  const ubicacionOptions = useMemo(
    () => catalogs.ubicaciones.map((i) => ({ value: i.id, label: i.nombre })),
    [catalogs.ubicaciones],
  );

  const disenadorOptions = useMemo(
    () => catalogs.disenadores.map((d) => ({ value: d.id, label: d.nombre })),
    [catalogs.disenadores],
  );

  const dimaSelectOptions = useMemo(
    () => dimaOptions.map((value) => ({ value, label: value })),
    [dimaOptions],
  );

  const procesoSelectOptions = useMemo(
    () => procesoOptions.map((value) => ({ value, label: value })),
    [procesoOptions],
  );

  const segmentoSelectOptions = useMemo(() => {
    const values = new Set();
    dbSegmentoValues.forEach((v) => values.add(String(v).trim()));
    rows.forEach((row) => {
      if (row.segmento) values.add(String(row.segmento).trim());
    });
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));
  }, [dbSegmentoValues, rows]);

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const startIndex = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, totalItems);
  const { safePage, safeTotal, buttons } = buildPagination({
    page,
    totalPages,
    maxButtons: 8,
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => {
    setMolderiaInputValue("");
    setFilters({
      q: "",
      estado: "",
      segmento: "",
      clienteid: "",
      ubicacionid: "",
      licenciado: "",
      dima: "",
      molderia: "",
      molderiaid: "",
      disenadorid: "",
      mes: "",
      from: "",
      to: "",
    });
  };

  const MESES = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  /** Recibe el número de mes 1-12 (string) o "" para limpiar */
  const handleMesChange = (mesNum) => {
    if (!mesNum) {
      setFilters((p) => ({ ...p, mes: "", from: "", to: "" }));
      return;
    }
    // Solo setea mes; el backend usa EXTRACT(MONTH) para filtrar sin importar el año
    setFilters((p) => ({ ...p, mes: mesNum, from: "", to: "" }));
  };

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
      fechaelaboracion: toDateInput(row.fechaelaboracion),
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
      const isDuplicate = pendingPhotos.some(
        (p) => p.name === file.name && p.size === file.size,
      );
      if (isDuplicate) {
        toast.error(`La imagen "${file.name}" ya fue agregada.`);
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
      toast.error(`La imagen "${file.name}" ya fue subida.`);
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
      toast.success("Foto subida correctamente");
    } catch (err) {
      console.error("Error subiendo foto:", err);
      toast.error("Error al subir foto");
    } finally {
      setUploadingPhoto(false);
      if (photoFileRef.current) photoFileRef.current.value = "";
    }
  };

  const deletePhoto = async (photoId) => {
    try {
      await api.delete(`${ENDPOINTS.fotos}/${photoId}`);
      setEditPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Foto eliminada");
    } catch (err) {
      console.error("Error eliminando foto:", err);
      toast.error("Error al eliminar foto");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 80);
    } catch {
      toast.error(
        "No se pudo acceder a la cámara. Verifica los permisos del navegador.",
      );
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
      const file = new File([blob], `camara-${Date.now()}.png`, {
        type: "image/png",
      });
      handlePhotoFileUpload(file);
      stopCamera();
    }, "image/png");
  };

  const removePendingPhoto = (index) => {
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        pareselaborados: toNumber(form.pareselaborados) || 0,
        talla: toNumber(form.talla),
        licenciado: Boolean(form.licenciado),
      };

      if (editing) {
        // Si es una variación, actualizar en tabla variaciones; si no, en muestras
        const isVariation = esMuestraVariacion(editing);
        if (isVariation) {
          await variaciones.update(editing.id, payload);
          toast.success("Variación actualizada correctamente");
        } else {
          await muestras.update(editing.id, payload);
          toast.success("Muestra actualizada correctamente");
        }
      } else {
        const newMuestra = await muestras.create(payload);
        toast.success("Muestra creada correctamente");

        // Subir fotos pendientes si hay
        if (pendingPhotos.length > 0 && newMuestra?.id) {
          const uploadPromise = async () => {
            for (const file of pendingPhotos) {
              const fd = new FormData();
              fd.append("file", file);
              fd.append("muestraid", newMuestra.id);
              fd.append("origen", "archivo");
              fd.append("fechacarga", new Date().toISOString().slice(0, 10));
              await api.postForm(`${ENDPOINTS.fotos}/upload`, fd);
            }
          };
          toast.promise(uploadPromise(), {
            loading: "Subiendo fotos adjuntas...",
            success: "Fotos guardadas correctamente",
            error: "Ocurrió un error al subir algunas fotos",
          });
        }
      }
      resetAndClose();
      fetchRows(filters, page);
    } catch (err) {
      toast.error(err.message || "Error al guardar la muestra");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await muestras.remove(rowToDelete.id);
      setRowToDelete(null);
      fetchRows(filters, page);
      toast.success("Muestra eliminada correctamente");
    } catch (err) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const openView = async (row) => {
    const ownerId = row.id;
    const isVariation = esMuestraVariacion(row);
    setViewRow(row);
    setPresentaciones([]);
    setViewPhotos([]);
    setQrUrl("");
    setQrLink("");
    setVariacionesAnexadas([]);
    setLoadingPres(true);
    setLoadingViewPhotos(true);
    setLoadingVariaciones(!isVariation);
    try {
      const presentacionesEndpoint = isVariation
        ? `${ENDPOINTS.variaciones}/${ownerId}/presentaciones`
        : `${ENDPOINTS.muestras}/${ownerId}/presentaciones`;

      const [presResult, fotosResult, variacionesResult] =
        await Promise.allSettled([
          api.get(presentacionesEndpoint),
          api.get(`${ENDPOINTS.fotos}?muestraid=${ownerId}`),
          isVariation
            ? Promise.resolve([])
            : api.get(
                `${ENDPOINTS.variaciones}?muestraOriginalId=${ownerId}&page=1&limit=5000`,
              ),
        ]);

      setPresentaciones(
        presResult.status === "fulfilled" ? toCollection(presResult.value) : [],
      );

      setViewPhotos(
        fotosResult.status === "fulfilled"
          ? toCollection(fotosResult.value)
          : [],
      );

      if (isVariation) {
        setVariacionesAnexadas([]);
      } else {
        const variacionesData =
          variacionesResult.status === "fulfilled"
            ? toCollection(variacionesResult.value)
            : [];
        setVariacionesAnexadas(variacionesData);
      }

      try {
        const baseUrl = window.location.origin;
        const detailUrl = `${baseUrl}/muestra/${ownerId}`;
        setQrLink(detailUrl);
        const qrDataUrl = await generateQrDataUrl(detailUrl);
        setQrUrl(qrDataUrl);
      } catch {
        setQrUrl("");
        setQrLink("");
      }
    } catch {
      setPresentaciones([]);
      setViewPhotos([]);
      setVariacionesAnexadas([]);
    } finally {
      setLoadingPres(false);
      setLoadingViewPhotos(false);
      setLoadingVariaciones(false);
    }
  };

  const openEditFromDetail = (row) => {
    setViewRow(null);
    setTimeout(() => openEdit(row), 100);
  };

  const columns = [
    { key: "referencia", label: "Referencia" },
    { key: "segmento", label: "Segmento" },
    {
      key: "molderiaid",
      label: "Moldería",
      render: (row) =>
        typeof row.molderia === "object" ? row.molderia.nombre : row.molderia,
    },
    {
      key: "estado",
      label: "Estado",
      render: (row) => <EstadoBadge estado={row.estado} />,
    },
    {
      key: "clienteid",
      label: "Cliente",
      render: (row) =>
        safe(catalogs.clientesMap?.[row.clienteid] ?? row.clienteid),
    },
    {
      key: "ubicacionid",
      label: "Ubicación",
      render: (row) =>
        safe(catalogs.ubicacionesMap?.[row.ubicacionid] ?? row.ubicacionid),
    },
    {
      key: "disenadorid",
      label: "Diseñador",
      render: (row) => {
        if (typeof row.disenador === "object" && row.disenador?.nombre)
          return row.disenador.nombre;
        if (typeof row.disenador === "string" && row.disenador.trim() !== "")
          return row.disenador;
        return safe(
          catalogs.disenadoresMap?.[row.disenadorid] ?? row.disenadorid,
        );
      },
    },
    {
      key: "fechaelaboracion",
      label: "Fecha",
      render: (row) => {
        if (!row.fechaelaboracion) return "—";
        const d = new Date(row.fechaelaboracion);
        if (isNaN(d.getTime())) return row.fechaelaboracion;
        // Formato compacto: 15/ene./25
        return d.toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });
      },
    },
    {
      key: "_ver",
      label: "",
      render: (row) => (
        <div className="inline-flex items-center gap-2">
          {esMuestraVariacion(row) && (
            <span className="inline-flex items-center rounded-full border border-indigo-300 bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
              Var
            </span>
          )}
          <button
            type="button"
            onClick={() => openView(row)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B3D8F]/20 bg-[#eef2ff] px-2.5 py-1.5 text-xs font-semibold text-[#1B3D8F] transition hover:bg-[#1B3D8F] hover:text-white"
          >
            <FiEye className="h-3.5 w-3.5" />
            Ver
          </button>
        </div>
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
            Registro, actualización y clasificación operativa de todas las
            muestras.
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
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
            showFilters || activeFilterCount > 0
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
            type="button"
            onClick={clearFilters}
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
            <Select
              options={segmentoSelectOptions}
              isClearable
              placeholder="Buscar segmento..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              value={
                filters.segmento
                  ? { value: filters.segmento, label: filters.segmento }
                  : null
              }
              onChange={(opt) =>
                setFilters((p) => ({ ...p, segmento: opt ? opt.value : "" }))
              }
            />
            <select
              className={inputCls}
              value={filters.estado}
              onChange={(e) =>
                setFilters((p) => ({ ...p, estado: e.target.value }))
              }
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_META).map(([val, { label }]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.clienteid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, clienteid: e.target.value }))
              }
            >
              <option value="">Todos los clientes</option>
              {catalogs.clientes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            <Select
              options={catalogs.molderias.map((i) => ({
                value: i.nombre,
                label: i.nombre,
              }))}
              isClearable
              placeholder="Buscar moldería..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              inputValue={molderiaInputValue}
              value={
                filters.molderia && !molderiaInputValue
                  ? { value: filters.molderia, label: filters.molderia }
                  : null
              }
              onInputChange={(val, { action }) => {
                // Al escribir: actualiza el input Y el filtro de texto libre
                if (action === "input-change") {
                  setMolderiaInputValue(val);
                  setFilters((p) => ({ ...p, molderia: val, molderiaid: "" }));
                }
              }}
              onChange={(opt) => {
                if (opt) {
                  // Selección exacta desde el dropdown
                  setMolderiaInputValue("");
                  setFilters((p) => ({
                    ...p,
                    molderia: opt.value,
                    molderiaid: "",
                  }));
                } else {
                  // Limpiar con X
                  setMolderiaInputValue("");
                  setFilters((p) => ({ ...p, molderia: "", molderiaid: "" }));
                }
              }}
            />
            <select
              className={inputCls}
              value={filters.ubicacionid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, ubicacionid: e.target.value }))
              }
            >
              <option value="">Todas las ubicaciones</option>
              {catalogs.ubicaciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.disenadorid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, disenadorid: e.target.value }))
              }
            >
              <option value="">Todos los diseñadores</option>
              {catalogs.disenadores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.licenciado}
              onChange={(e) =>
                setFilters((p) => ({ ...p, licenciado: e.target.value }))
              }
            >
              <option value="">Licencia (todas)</option>
              <option value="true">Licenciado</option>
              <option value="false">Genérico</option>
            </select>
            <Select
              options={dimaSelectOptions}
              isClearable
              placeholder="Buscar DIMA..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              value={
                filters.dima
                  ? { value: filters.dima, label: filters.dima }
                  : null
              }
              onChange={(opt) =>
                setFilters((p) => ({ ...p, dima: opt ? opt.value : "" }))
              }
            />
            {/* Filtro por mes */}
            <select
              className={inputCls}
              value={filters.mes}
              onChange={(e) => handleMesChange(e.target.value)}
            >
              <option value="">Todos los meses</option>
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {nombre}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Rango de fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className={inputCls}
                  value={filters.from}
                  placeholder="Desde"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, from: e.target.value, mes: "" }))
                  }
                />
                <input
                  type="date"
                  className={inputCls}
                  value={filters.to}
                  placeholder="Hasta"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, to: e.target.value, mes: "" }))
                  }
                />
              </div>
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
            {totalItems === 0
              ? "Sin resultados"
              : `${startIndex}–${endIndex} de ${totalItems} muestras`}
          </p>
          {loadingRows && (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
          )}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="text-slate-500 text-xs">Total</span>
            <span className="font-bold text-[#1B3D8F]">{totalItems}</span>
          </div>
        </div>
        <DataGrid
          columns={columns}
          rows={rows}
          onEdit={openEdit}
          onDelete={(row) => setRowToDelete(row)}
          minWidthClass="min-w-full"
          containerClassName="shadow-none rounded-none border-0"
        />
        {safeTotal > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-slate-100 px-5 py-3.5">
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage <= 1}
              onClick={() => setPage(1)}
            >
              <FiChevronsLeft />
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <FiChevronLeft />
            </button>
            {buttons.map((item) =>
              typeof item === "string" ? (
                <span key={item} className="px-2 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={
                    item === safePage
                      ? "rounded-xl bg-[#1B3D8F] px-3 py-2 text-sm font-bold text-white"
                      : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  }
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage >= safeTotal}
              onClick={() => setPage((p) => Math.min(safeTotal, p + 1))}
            >
              <FiChevronRight />
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage >= safeTotal}
              onClick={() => setPage(safeTotal)}
            >
              <FiChevronsRight />
            </button>
          </div>
        )}
      </div>

      {/* ── MODAL ELIMINAR ── */}
      {rowToDelete && (
        <Modal
          title="Confirmar eliminación"
          onClose={() => setRowToDelete(null)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <div>
                <p className="m-0 font-semibold">
                  Esta acción no se puede deshacer.
                </p>
                <p className="m-0 text-sm text-rose-600">
                  Se eliminará la muestra{" "}
                  <strong>{rowToDelete.referencia}</strong>.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setRowToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-[0.98]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      {modalOpen && (
        <Modal
          title={editing ? "Editar muestra" : "Nueva muestra"}
          onClose={resetAndClose}
        >
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
            <FieldWrap label="Referencia">
              <input
                className={inputCls}
                required
                value={form.referencia || ""}
                onChange={(e) => onChange("referencia", e.target.value)}
                placeholder="Ej: REF-001"
              />
            </FieldWrap>
            <FieldWrap label="Segmento">
              <input
                className={inputCls}
                required
                value={form.segmento || ""}
                onChange={(e) => onChange("segmento", e.target.value)}
                placeholder="Ej: Dama, Caballero..."
              />
            </FieldWrap>
            <FieldWrap label="DIMA">
              <Select
                options={dimaSelectOptions}
                placeholder="Selecciona DIMA"
                value={
                  dimaSelectOptions.find(
                    (o) => o.value === (form.dima || ""),
                  ) || null
                }
                onChange={(option) =>
                  onChange("dima", option ? option.value : "")
                }
                isClearable
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <FieldWrap label="Pares elaborados">
              <input
                className={inputCls}
                required
                type="number"
                min="0"
                value={form.pareselaborados ?? 0}
                onChange={(e) => onChange("pareselaborados", e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Talla">
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.talla || ""}
                onChange={(e) => onChange("talla", e.target.value)}
                placeholder="Talla base"
              />
            </FieldWrap>
            <FieldWrap label="Fecha de elaboración">
              <input
                className={inputCls}
                required
                type="date"
                value={toDateInput(form.fechaelaboracion)}
                onChange={(e) => onChange("fechaelaboracion", e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Estado">
              <select
                className={inputCls}
                value={form.estado || "nueva"}
                onChange={(e) => onChange("estado", e.target.value)}
              >
                {Object.entries(ESTADO_META).map(([val, { label }]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </FieldWrap>
            <FieldWrap label="Cliente">
              <Select
                options={clienteOptions}
                placeholder="Selecciona un cliente"
                value={
                  clienteOptions.find((o) => o.value === form.clienteid) || null
                }
                onChange={(option) =>
                  onChange("clienteid", option ? option.value : "")
                }
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <FieldWrap label="Moldería">
              <Select
                options={molderiaOptions}
                placeholder="Selecciona moldería"
                value={
                  molderiaOptions.find((o) => o.value === form.molderiaid) ||
                  null
                }
                onChange={(option) => {
                  if (option?.value === "__new__") {
                    setNewMolderiaName("");
                    setMolderiaPromptOpen(true);
                    return;
                  }
                  onChange("molderiaid", option ? option.value : "");
                }}
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <FieldWrap label="Ubicación">
              <Select
                options={ubicacionOptions}
                placeholder="Selecciona ubicación"
                value={
                  ubicacionOptions.find((o) => o.value === form.ubicacionid) ||
                  null
                }
                onChange={(option) =>
                  onChange("ubicacionid", option ? option.value : "")
                }
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <FieldWrap label="Diseñador">
              <Select
                options={disenadorOptions}
                placeholder="Selecciona diseñador"
                value={
                  disenadorOptions.find((o) => o.value === form.disenadorid) ||
                  null
                }
                onChange={(option) =>
                  onChange("disenadorid", option ? option.value : "")
                }
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <FieldWrap label="Proceso">
              <Select
                options={procesoSelectOptions}
                placeholder="Selecciona proceso"
                value={
                  procesoSelectOptions.find(
                    (o) => o.value === (form.proceso || ""),
                  ) || null
                }
                onChange={(option) =>
                  onChange("proceso", option ? option.value : "")
                }
                isClearable
                menuPlacement="bottom"
                menuPortalTarget={document.body}
                styles={selectStyles}
              />
            </FieldWrap>
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="licenciado-check"
                type="checkbox"
                checked={Boolean(form.licenciado)}
                onChange={(e) => onChange("licenciado", e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F] focus:ring-[#1B3D8F]"
              />
              <label
                htmlFor="licenciado-check"
                className="text-sm font-semibold text-slate-700"
              >
                Licenciado
              </label>
            </div>
            <FieldWrap label="Observaciones" full>
              <textarea
                className={inputCls}
                rows="3"
                value={form.observaciones || ""}
                onChange={(e) => onChange("observaciones", e.target.value)}
                placeholder="Notas adicionales..."
              />
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
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={photoFileRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handlePhotoFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoFileRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <FiUploadCloud className="h-3.5 w-3.5" /> Subir archivo
                  </button>
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={uploadingPhoto || cameraOpen}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D8F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#163272] disabled:opacity-50"
                  >
                    <FiCamera className="h-3.5 w-3.5" /> Usar cámara
                  </button>
                </div>
              </div>

              {/* Grid de fotos subidas (edición) */}
              {editing && editPhotos.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                  {editPhotos.map((p) => (
                    <div
                      key={p.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <img
                        src={`${API_ROOT_URL}${p.urlarchivo}`}
                        alt="Muestra"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => deletePhoto(p.id)}
                          className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition"
                        >
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
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                    >
                      <img
                        src={URL.createObjectURL(f)}
                        alt="Pendiente"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removePendingPhoto(i)}
                          className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur">
                        Por subir
                      </span>
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
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="h-[300px] w-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="rounded-full bg-white/10 p-3 text-white backdrop-blur hover:bg-white/20"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCameraCapture}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1B3D8F] shadow-lg hover:scale-105 transition"
                    >
                      <FiCamera className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-full flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="ghost-btn"
                onClick={resetAndClose}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163272] active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Crear muestra"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL NUEVA MOLDERÍA ── */}
      {molderiaPromptOpen && (
        <Modal
          title="Crear nueva moldería"
          onClose={() => setMolderiaPromptOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newMolderiaName.trim()) return;
              setCreatingMolderia(true);
              try {
                const created = await api.post(ENDPOINTS.molderias, {
                  nombre: newMolderiaName.trim().toUpperCase(),
                  tipohorma: "Pendiente",
                  talon: "Pendiente",
                  punta: "Pendiente",
                  esnueva: true,
                });
                await catalogs.load();
                onChange("molderiaid", created.id);
                toast.success("Moldería creada exitosamente");
                setMolderiaPromptOpen(false);
              } catch (err) {
                toast.error(err.message || "Error creando moldería");
              } finally {
                setCreatingMolderia(false);
              }
            }}
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Ingresa el nombre para la nueva moldería. Se guardará en
                mayúsculas automáticamente.
              </p>
              <input
                type="text"
                required
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 uppercase focus:border-[#1B3D8F] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1B3D8F]/10"
                placeholder="Ej. SUECA 123"
                value={newMolderiaName}
                onChange={(e) => setNewMolderiaName(e.target.value)}
                disabled={creatingMolderia}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => setMolderiaPromptOpen(false)}
                  disabled={creatingMolderia}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163272] disabled:opacity-50"
                  disabled={creatingMolderia}
                >
                  {creatingMolderia ? "Creando..." : "Guardar moldería"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL DETALLE ── */}
      {viewRow && (
        <Modal
          title={`Detalle — ${viewRow.referencia}`}
          onClose={() => setViewRow(null)}
        >
          <div className="space-y-6">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => openEditFromDetail(viewRow)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1B3D8F] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#163272] active:scale-[0.98]"
              >
                <FiEdit2 className="h-3.5 w-3.5" />
                {esMuestraVariacion(viewRow)
                  ? "Editar variación"
                  : "Editar muestra"}
              </button>
            </div>
            {/* ── Fotos ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Fotos
                </h3>
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
                  <p className="text-xs font-medium text-slate-400">
                    Sin fotos registradas para esta muestra.
                  </p>
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
                        <span className="text-[10px] font-semibold text-white">
                          Ver
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                { label: "Referencia", value: viewRow.referencia },
                { label: "Segmento", value: viewRow.segmento },
                {
                  label: "Estado",
                  value: esMuestraVariacion(viewRow) ? (
                    "—"
                  ) : (
                    <EstadoBadge estado={viewRow.estado} />
                  ),
                },
                ...(esMuestraVariacion(viewRow)
                  ? [{ label: "Variación", value: "Sí" }]
                  : []),
                {
                  label: "Moldería",
                  value: safe(
                    catalogs.molderiasMap?.[viewRow.molderiaid] ??
                      viewRow.molderia,
                  ),
                },
                { label: "Pares elaborados", value: viewRow.pareselaborados },
                {
                  label: "Fecha elaboración",
                  value: viewRow.fechaelaboracion?.slice(0, 10),
                },
                {
                  label: "Cliente",
                  value: safe(
                    catalogs.clientesMap?.[viewRow.clienteid] ??
                      viewRow.clienteid,
                  ),
                },
                {
                  label: "Ubicación",
                  value: safe(
                    catalogs.ubicacionesMap?.[viewRow.ubicacionid] ??
                      viewRow.ubicacionid,
                  ),
                },
                {
                  label: "Diseñador",
                  value:
                    typeof viewRow.disenador === "object" &&
                    viewRow.disenador?.nombre
                      ? viewRow.disenador.nombre
                      : typeof viewRow.disenador === "string" &&
                          viewRow.disenador.trim() !== ""
                        ? viewRow.disenador
                        : safe(
                            catalogs.disenadoresMap?.[viewRow.disenadorid] ??
                              viewRow.disenadorid,
                          ),
                },
                { label: "DIMA", value: viewRow.dima || "—" },
                { label: "Licencia", value: viewRow.licencia || "—" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {label}
                  </p>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {value ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* Presentaciones */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Presentaciones
                </h3>
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
                  <p className="text-sm font-semibold text-slate-400">
                    Sin presentaciones registradas
                  </p>
                  <p className="text-xs text-slate-400">
                    Esta muestra aún no ha sido presentada.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {presentaciones.map((p) => {
                    const resultadoCls =
                      {
                        aprobada:
                          "bg-emerald-50 text-emerald-700 border-emerald-200",
                        producida:
                          "bg-emerald-50 text-emerald-700 border-emerald-200",
                        rechazada: "bg-rose-50 text-rose-700 border-rose-200",
                        pendiente:
                          "bg-orange-50 text-orange-700 border-orange-200",
                        parcial: "bg-amber-50 text-amber-700 border-amber-200",
                        revisar:
                          "bg-violet-50 text-violet-700 border-violet-200",
                      }[p.resultado] ??
                      "bg-slate-50 text-slate-600 border-slate-200";
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingPresentacion({ ...p })}
                        onKeyDown={(e) =>
                          e.key === "Enter" && setEditingPresentacion({ ...p })
                        }
                        className="group rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-pointer transition hover:border-[#1B3D8F]/40 hover:shadow-md hover:shadow-[#1B3D8F]/5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800 group-hover:text-[#1B3D8F] transition">
                              {p.cliente?.nombre ||
                                safe(catalogs.clientesMap?.[p.clienteid]) ||
                                "Cliente desconocido"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.cliente?.region
                                ? `Región: ${p.cliente.region} · `
                                : ""}
                              Fecha: {p.fecha?.slice(0, 10) || "—"}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {p.resultado && p.resultado !== "undefined" && (
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${resultadoCls}`}
                              >
                                {p.resultado}
                              </span>
                            )}
                            {p.derivoproduccion && (
                              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                                Derivó a producción
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#1B3D8F]/20 bg-[#eef2ff] px-2 py-1 text-[10px] font-semibold text-[#1B3D8F] opacity-0 group-hover:opacity-100 transition">
                              <FiEdit2 className="h-3 w-3" /> Editar
                            </span>
                          </div>
                        </div>
                        {(p.paresaprobados > 0 || p.paresrechazados > 0) && (
                          <div className="mt-2 flex gap-4 text-xs text-slate-500">
                            {p.paresaprobados > 0 && (
                              <span className="text-emerald-600">
                                ✓ {p.paresaprobados} aprobados
                              </span>
                            )}
                            {p.paresrechazados > 0 && (
                              <span className="text-rose-600">
                                ✗ {p.paresrechazados} rechazados
                              </span>
                            )}
                          </div>
                        )}
                        {p.observaciones &&
                          p.observaciones.trim() &&
                          p.observaciones !== "undefined" && (
                            <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                              {p.observaciones}
                            </p>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clientes sin presentación */}
            {!loadingPres &&
              catalogs.clientes.length > 0 &&
              (() => {
                const presentadosIds = new Set(
                  presentaciones.map((p) => p.clienteid),
                );
                const noPresentados = catalogs.clientes.filter(
                  (c) => !presentadosIds.has(c.id),
                );
                return (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Clientes sin presentación
                      </h3>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white ${noPresentados.length === 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                      >
                        {noPresentados.length}
                      </span>
                    </div>
                    {noPresentados.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <span className="text-emerald-600">✓</span>
                        <p className="text-sm font-semibold text-emerald-700">
                          Presentada a todos los clientes registrados.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {noPresentados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setPresentacionForm({
                                muestraid: viewRow.id,
                                clienteid: c.id,
                                fecha: new Date().toISOString().slice(0, 10),
                                resultado: "pendiente",
                                paresaprobados: 0,
                                paresrechazados: 0,
                                derivoproduccion: false,
                                observaciones: "",
                              });
                              setPresentacionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 transition cursor-pointer group"
                          >
                            <FiPlus className="h-3.5 w-3.5 shrink-0 text-amber-500 group-hover:scale-110 transition" />
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-amber-800 leading-tight">
                                {c.nombre}
                              </p>
                              {c.region && (
                                <p className="text-[10px] text-amber-600 leading-tight">
                                  {c.region}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            {!esMuestraVariacion(viewRow) && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Variaciones
                  </h3>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1B3D8F] text-[10px] font-black text-white">
                    {loadingVariaciones ? "…" : variacionesAnexadas.length}
                  </span>
                </div>
                {loadingVariaciones ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
                    Cargando variaciones...
                  </div>
                ) : variacionesAnexadas.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-6 text-center">
                    <p className="text-xs font-medium text-slate-400">
                      Sin variaciones registradas para esta muestra.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {variacionesAnexadas.map((v) => (
                      <div
                        key={v.id}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {formatearReferenciaVariacion(v)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {v.segmento || "—"}
                              {v.estado ? ` · ${v.estado}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {typeof v.molderia === "object"
                                ? v.molderia?.nombre
                                : safe(
                                      catalogs.molderiasMap?.[v.molderiaid],
                                    ) !== "—"
                                  ? safe(catalogs.molderiasMap?.[v.molderiaid])
                                  : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewRow(null);
                                setTimeout(() => openView(v), 100);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B3D8F]/20 bg-[#eef2ff] px-2.5 py-1.5 text-xs font-semibold text-[#1B3D8F] transition hover:bg-[#1B3D8F] hover:text-white"
                            >
                              <FiEye className="h-3.5 w-3.5" />
                              Ver
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QR y botón de impresión */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Código QR
                </h3>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row gap-6 items-center justify-center">
                {qrUrl ? (
                  <>
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={qrUrl}
                        alt="QR"
                        width="200"
                        height="200"
                        className="border border-slate-200 rounded-lg"
                      />
                      {qrLink && (
                        <div className="w-full max-w-sm text-center">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                            URL
                          </p>
                          <p className="text-xs text-slate-600 break-all font-mono">
                            {qrLink}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center justify-center gap-6 py-4">
                      <p className="text-sm text-slate-600 text-center">
                        Escanea este código QR con tu dispositivo para acceder a
                        los detalles completos de esta muestra.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const printWindow = window.open();
                          const html = `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta charset="UTF-8" />
                                <title>QR - ${viewRow.referencia}</title>
                                <style>
                                  * { margin: 0; padding: 0; box-sizing: border-box; }
                                  body { font-family: system-ui, -apple-system, sans-serif; padding: 40px 20px; background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
                                  .qr-container { text-align: center; padding: 30px; border: 2px solid #e5e7eb; border-radius: 8px; max-width: 450px; }
                                  h1 { margin-bottom: 10px; font-size: 24px; font-weight: 700; color: #1f2937; }
                                  .label { margin-bottom: 20px; font-size: 14px; color: #6b7280; font-weight: 500; }
                                  .qr-image { margin: 30px 0; display: flex; justify-content: center; }
                                  img { width: 300px; height: 300px; border: 2px solid #e5e7eb; padding: 8px; background: white; display: block; image-rendering: pixelated; }
                                  .qr-url { margin-top: 20px; font-size: 12px; color: #6b7280; word-break: break-all; font-family: monospace; }
                                  @media print { body { padding: 0; background: white; } .qr-container { border: none; } }
                                </style>
                              </head>
                              <body>
                                <div class="qr-container">
                                  <h1>${viewRow.referencia}</h1>
                                  <div class="label">Segmento: ${viewRow.segmento || "-"}</div>
                                  <div class="label">Moldería: ${typeof viewRow.molderia === "object" ? viewRow.molderia?.nombre || "-" : viewRow.molderia || "-"}</div>
                                  <div class="qr-image">
                                    <img src="${qrUrl}" alt="QR Code" onload="setTimeout(() => window.print(), 300);" />
                                  </div>
                                  <div class="qr-url">${qrLink}</div>
                                </div>
                              </body>
                            </html>
                          `;
                          printWindow.document.open();
                          printWindow.document.write(html);
                          printWindow.document.close();
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1B3D8F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#142a5f] transition"
                      >
                        <FiPrinter className="h-4 w-4" />
                        Imprimir QR
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center py-8 text-slate-400">
                    <div className="text-center">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F] mx-auto mb-2" />
                      <p className="text-sm">Generando código QR...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DE PRESENTACIÓN (desde clientes sin presentación) ── */}
      {presentacionModalOpen && (
        <Modal
          title="Nueva presentación"
          onClose={() => setPresentacionModalOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingPresentacion) return;
              setSavingPresentacion(true);
              try {
                await presentacionesCrud.create({
                  ...presentacionForm,
                  paresaprobados:
                    toNumber(presentacionForm.paresaprobados) || 0,
                  paresrechazados:
                    toNumber(presentacionForm.paresrechazados) || 0,
                });
                toast.success("Presentación creada correctamente");
                setPresentacionModalOpen(false);
                // Recargar las presentaciones del modal detalle
                if (viewRow) {
                  const isVariation = esMuestraVariacion(viewRow);
                  const presentacionesEndpoint = isVariation
                    ? `${ENDPOINTS.variaciones}/${viewRow.id}/presentaciones`
                    : `${ENDPOINTS.muestras}/${viewRow.id}/presentaciones`;
                  const presData = await api.get(presentacionesEndpoint);
                  setPresentaciones(Array.isArray(presData) ? presData : []);
                }
              } catch (err) {
                console.error("Error creando presentación:", err);
                toast.error(err.message || "Error al crear presentación");
              } finally {
                setSavingPresentacion(false);
              }
            }}
            className="space-y-6"
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Muestra
                  </span>
                  <input
                    type="text"
                    disabled
                    value={viewRow?.referencia || "—"}
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Cliente
                  </span>
                  <input
                    type="text"
                    disabled
                    value={
                      catalogs.clientes.find(
                        (c) => c.id === presentacionForm.clienteid,
                      )?.nombre || "—"
                    }
                    className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Fecha *
                  </span>
                  <input
                    type="date"
                    required
                    value={presentacionForm.fecha}
                    onChange={(e) =>
                      setPresentacionForm((p) => ({
                        ...p,
                        fecha: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Resultado *
                  </span>
                  <select
                    required
                    value={presentacionForm.resultado}
                    onChange={(e) =>
                      setPresentacionForm((p) => ({
                        ...p,
                        resultado: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                  >
                    <option value="">Selecciona</option>
                    <option value="producida">Producida</option>
                    <option value="rechazada">Rechazada</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="revisar">Revisar</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Producción
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={presentacionForm.paresaprobados}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPresentacionForm((p) => ({
                        ...p,
                        paresaprobados: value,
                      }));
                      const numValue = toNumber(value);
                      if (numValue > 0) {
                        setPresentacionForm((p) => ({
                          ...p,
                          derivoproduccion: true,
                        }));
                      }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(presentacionForm.derivoproduccion)}
                  onChange={(e) =>
                    setPresentacionForm((p) => ({
                      ...p,
                      derivoproduccion: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F]"
                />
                <span className="text-sm font-medium text-slate-700">
                  Derivó en producción
                </span>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-slate-700">
                  Observaciones
                </span>
                <textarea
                  rows="3"
                  placeholder="Notas o comentarios adicionales..."
                  value={presentacionForm.observaciones || ""}
                  onChange={(e) =>
                    setPresentacionForm((p) => ({
                      ...p,
                      observaciones: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setPresentacionModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingPresentacion}
                className="primary-btn"
              >
                {savingPresentacion ? "Guardando..." : "Crear presentación"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL DETALLE / EDICIÓN DE PRESENTACIÓN EXISTENTE ── */}
      {editingPresentacion && (
        <Modal
          title={`Presentación — ${
            editingPresentacion.cliente?.nombre ||
            safe(catalogs.clientesMap?.[editingPresentacion.clienteid]) ||
            "Cliente"
          }`}
          onClose={() => setEditingPresentacion(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (savingEditPres) return;
              setSavingEditPres(true);
              try {
                await presentacionesCrud.update(editingPresentacion.id, {
                  fecha: editingPresentacion.fecha,
                  resultado: editingPresentacion.resultado,
                  paresaprobados:
                    toNumber(editingPresentacion.paresaprobados) || 0,
                  paresrechazados:
                    toNumber(editingPresentacion.paresrechazados) || 0,
                  derivoproduccion: Boolean(
                    editingPresentacion.derivoproduccion,
                  ),
                  observaciones: editingPresentacion.observaciones || "",
                });
                toast.success("Presentación actualizada");
                // Recargar lista
                if (viewRow) {
                  const isVariation = esMuestraVariacion(viewRow);
                  const ep = isVariation
                    ? `${ENDPOINTS.variaciones}/${viewRow.id}/presentaciones`
                    : `${ENDPOINTS.muestras}/${viewRow.id}/presentaciones`;
                  const presData = await api.get(ep);
                  setPresentaciones(Array.isArray(presData) ? presData : []);
                }
                setEditingPresentacion(null);
              } catch (err) {
                console.error("Error actualizando presentación:", err);
                toast.error(err.message || "Error al actualizar presentación");
              } finally {
                setSavingEditPres(false);
              }
            }}
            className="space-y-5"
          >
            {/* Info de solo lectura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Referencia
                </span>
                <input
                  type="text"
                  disabled
                  value={viewRow?.referencia || "—"}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Cliente
                </span>
                <input
                  type="text"
                  disabled
                  value={
                    editingPresentacion.cliente?.nombre ||
                    safe(
                      catalogs.clientesMap?.[editingPresentacion.clienteid],
                    ) ||
                    "—"
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                />
              </label>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Fecha *
                </span>
                <input
                  type="date"
                  required
                  value={editingPresentacion.fecha?.slice(0, 10) || ""}
                  onChange={(e) =>
                    setEditingPresentacion((p) => ({
                      ...p,
                      fecha: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Resultado *
                </span>
                <select
                  required
                  value={editingPresentacion.resultado || ""}
                  onChange={(e) =>
                    setEditingPresentacion((p) => ({
                      ...p,
                      resultado: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                >
                  <option value="">Selecciona</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="producida">Producida</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                  <option value="revisar">Revisar</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Pares aprobados
                </span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editingPresentacion.paresaprobados ?? 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditingPresentacion((p) => ({
                      ...p,
                      paresaprobados: v,
                      derivoproduccion:
                        toNumber(v) > 0 ? true : p.derivoproduccion,
                    }));
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(editingPresentacion.derivoproduccion)}
                onChange={(e) =>
                  setEditingPresentacion((p) => ({
                    ...p,
                    derivoproduccion: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F]"
              />
              <span className="text-sm font-medium text-slate-700">
                Derivó en producción
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Observaciones
              </span>
              <textarea
                rows="3"
                placeholder="Notas o comentarios adicionales..."
                value={editingPresentacion.observaciones || ""}
                onChange={(e) =>
                  setEditingPresentacion((p) => ({
                    ...p,
                    observaciones: e.target.value,
                  }))
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setEditingPresentacion(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingEditPres}
                className="primary-btn"
              >
                {savingEditPres ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
