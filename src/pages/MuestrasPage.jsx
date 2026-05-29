import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertTriangle,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiEye,
} from "react-icons/fi";
import { api, API_ROOT_URL } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { parseDateValue, toDateInput, toNumber } from "../utils/format";
import { buildPagination } from "../utils/pagination";
import { generateQrDataUrl } from "../utils/qr";

import { MuestrasFilters } from "../components/Muestras/MuestrasFilters";
import { MuestraFormModal } from "../components/Muestras/MuestraFormModal";
import { MuestraDetailModal } from "../components/Muestras/MuestraDetailModal";
import { EstadoBadge, inputCls, selectStyles } from "../components/Muestras/MuestrasUI";
import { emptyForm, esMuestraVariacion, toCollection, safe, formatearReferenciaVariacion, ESTADO_META } from "../components/Muestras/MuestrasUtils";

const PAGE_SIZE = 20;
const MUESTRAS_VIEW_STATE_KEY = "cmstock_muestras_view_state";

const initialFilters = {
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
};

const readViewState = () => {
  try {
    const raw = sessionStorage.getItem(MUESTRAS_VIEW_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeViewState = (state) => {
  try {
    if (!state) {
      sessionStorage.removeItem(MUESTRAS_VIEW_STATE_KEY);
      return;
    }
    sessionStorage.setItem(MUESTRAS_VIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // No bloquear la UI si el navegador restringe sessionStorage.
  }
};

export const MuestrasPage = () => {
  const catalogs = useCatalogData();
  const muestras = useCrud(ENDPOINTS.muestras);
  const variaciones = useCrud(ENDPOINTS.variaciones);
  const presentacionesCrud = useCrud(ENDPOINTS.presentaciones);
  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingRows, setLoadingRows] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const savedViewState = useMemo(() => readViewState(), []);
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    ...(savedViewState?.filters || {}),
  }));
  const [showFilters, setShowFilters] = useState(() => Boolean(savedViewState?.showFilters));
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [presentaciones, setPresentaciones] = useState([]);
  const [loadingPres, setLoadingPres] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrLink, setQrLink] = useState("");
  const [page, setPage] = useState(() => Number(savedViewState?.page) || 1);
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

  useEffect(() => {
    writeViewState({ filters, showFilters, page, molderiaInputValue });
  }, [filters, showFilters, page, molderiaInputValue]);

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
      if (page === 1) {
        fetchRows(filters, 1);
      } else {
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [filters, page, fetchRows]);

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
    setFilters(initialFilters);
    setPage(1);
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
    {
      key: "fechaelaboracion",
      label: "Fecha",
      render: (row) => {
        if (!row.fechaelaboracion) return "—";
        const d = parseDateValue(row.fechaelaboracion);
        if (isNaN(d.getTime())) return row.fechaelaboracion;
        // Formato: 14-mayo-2026
        const dia = d.getDate();
        const mes = d.toLocaleDateString("es-CO", { month: "long" });
        const año = d.getFullYear();
        return `${dia}-${mes}-${año}`;
      },
    },
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

      {/* ── BÚSQUEDA Y FILTROS ── */}
      <MuestrasFilters
        filters={filters}
        setFilters={setFilters}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        activeFilterCount={activeFilterCount}
        clearFilters={clearFilters}
        openCreate={openCreate}
        catalogs={catalogs}
        segmentoSelectOptions={segmentoSelectOptions}
        dimaSelectOptions={dimaSelectOptions}
        procesoSelectOptions={procesoSelectOptions}
        molderiaInputValue={molderiaInputValue}
        setMolderiaInputValue={setMolderiaInputValue}
        handleMesChange={handleMesChange}
      />

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
        <MuestraFormModal
          editing={editing}
          form={form}
          onChange={onChange}
          onSubmit={onSubmit}
          isSaving={isSaving}
          resetAndClose={resetAndClose}
          dimaSelectOptions={dimaSelectOptions}
          clienteOptions={clienteOptions}
          molderiaOptions={molderiaOptions}
          setNewMolderiaName={setNewMolderiaName}
          setMolderiaPromptOpen={setMolderiaPromptOpen}
          ubicacionOptions={ubicacionOptions}
          disenadorOptions={disenadorOptions}
          procesoSelectOptions={procesoSelectOptions}
          photoFileRef={photoFileRef}
          handlePhotoFileUpload={handlePhotoFileUpload}
          uploadingPhoto={uploadingPhoto}
          startCamera={startCamera}
          cameraOpen={cameraOpen}
          editPhotos={editPhotos}
          deletePhoto={deletePhoto}
          pendingPhotos={pendingPhotos}
          removePendingPhoto={removePendingPhoto}
          videoRef={videoRef}
          canvasRef={canvasRef}
          stopCamera={stopCamera}
          handleCameraCapture={handleCameraCapture}
        />
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
        <MuestraDetailModal
          viewRow={viewRow}
          setViewRow={setViewRow}
          openEditFromDetail={openEditFromDetail}
          viewPhotos={viewPhotos}
          loadingViewPhotos={loadingViewPhotos}
          catalogs={catalogs}
          presentaciones={presentaciones}
          loadingPres={loadingPres}
          setPresentacionForm={setPresentacionForm}
          setPresentacionModalOpen={setPresentacionModalOpen}
          setEditingPresentacion={setEditingPresentacion}
          variacionesAnexadas={variacionesAnexadas}
          loadingVariaciones={loadingVariaciones}
          openView={openView}
          qrUrl={qrUrl}
          qrLink={qrLink}
        />
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
