import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { exportToExcel } from "../utils/excel";
import { useCatalogData } from "../hooks/useCatalogData";
import { FiChevronsLeft, FiChevronLeft, FiChevronRight, FiChevronsRight, FiSearch, FiFilter, FiX } from "react-icons/fi";
import { buildPagination } from "../utils/pagination";
import { parseDateValue } from "../utils/format";

const MONTH_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const toCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = parseDateValue(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatVariacion = (value) => {
  if (value === true || value === 1) return "si";
  if (value === false || value === 0) return "no";

  const normalized = normalizeText(value);
  if (["verdadero", "si", "s", "yes", "true", "1"].includes(normalized)) return "si";
  if (["falso", "no", "n", "false", "0"].includes(normalized)) return "no";

  return value ? String(value) : "-";
};

const formatDateValue = (value) => {
  const parsed = toDate(value);
  return parsed ? MONTH_FORMAT.format(parsed) : "-";
};

const MUESTRAS_PAGE_LIMIT = 500;

const fetchAllMuestras = async () => {
  let page = 1;
  let totalPages = 1;
  const allItems = [];

  while (page <= totalPages) {
    const payload = await api.get(
      `${ENDPOINTS.muestras}?page=${page}&limit=${MUESTRAS_PAGE_LIMIT}`,
    );
    const items = toCollection(payload);
    allItems.push(...items);

    totalPages = Number(payload?.totalPages || 1);
    if (!items.length) {
      break;
    }

    page += 1;
  }

  return allItems;
};

export const ReportesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    clienteId: "",
    estado: "",
    segmento: "",
    licencia: "",
    dima: "",
    variacion: "",
    molderiaid: "",
    ubicacionid: "",
    disenadorid: "",
    dateFrom: "",
    dateTo: "",
    limit: 15,
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    muestras: [],
    clientes: [],
    producciones: [],
    movimientos: [],
  });

  const catalogs = useCatalogData();

  // Small KPI card used also in Dashboard — copied here to avoid adding a new shared file
  const KpiCard = ({ value, title, subtitle, muted = false }) => (
    <article
      className={[
        "rounded-3xl border p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]",
        muted
          ? "border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 text-slate-500"
          : "border-slate-200 bg-gradient-to-b from-white to-[#f6fbff]",
      ].join(" ")}
    >
      <strong
        className={[
          "block text-[clamp(2rem,2.8vw,2.9rem)] leading-none tracking-[-0.04em]",
          muted ? "text-slate-500" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </strong>
      <p
        className={[
          "mt-2 text-sm font-semibold uppercase tracking-[0.08em]",
          muted ? "text-slate-500" : "text-[#1B3D8F]",
        ].join(" ")}
      >
        {title}
      </p>
      <small className={muted ? "text-slate-500" : "text-slate-600"}>{subtitle}</small>
    </article>
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [muestras, clientes, producciones, movimientos] = await Promise.all(
        [
          fetchAllMuestras(),
          api.get(ENDPOINTS.clientes),
          api.get(ENDPOINTS.producciones),
          api.get(ENDPOINTS.movimientosInventario),
        ],
      );
      setData({
        muestras: toCollection(muestras),
        clientes: toCollection(clientes),
        producciones: toCollection(producciones),
        movimientos: toCollection(movimientos),
      });
    } catch (err) {
      setError(err.message || "No se pudieron cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    filters.query,
    filters.clienteId,
    filters.estado,
    filters.segmento,
    filters.licencia,
    filters.dima,
    filters.variacion,
    filters.molderiaid,
    filters.ubicacionid,
    filters.disenadorid,
    filters.dateFrom,
    filters.dateTo,
    filters.limit,
  ]);

  const clienteById = useMemo(
    () => new Map(data.clientes.map((item) => [item.id, item.nombre || "Cliente"])),
    [data.clientes],
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const estadoOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.estado) unique.add(item.estado);
    }
    return Array.from(unique).sort();
  }, [data.muestras]);

  const segmentoOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.segmento) unique.add(item.segmento);
    }
    return Array.from(unique).sort();
  }, [data.muestras]);

  const licenciaOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.licencia) unique.add(item.licencia);
    }
    return Array.from(unique).sort();
  }, [data.muestras]);

  const dimaOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.dima) unique.add(item.dima);
    }
    return Array.from(unique).sort();
  }, [data.muestras]);

  const molderiasOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.molderiaid) unique.add(item.molderiaid);
    }
    return Array.from(unique);
  }, [data.muestras]);

  const ubicacionesOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.ubicacionid) unique.add(item.ubicacionid);
    }
    return Array.from(unique);
  }, [data.muestras]);

  const disenadoresOptions = useMemo(() => {
    const unique = new Set();
    for (const item of data.muestras) {
      if (item.disenadorid) unique.add(item.disenadorid);
    }
    return Array.from(unique);
  }, [data.muestras]);

  const filteredMuestras = useMemo(() => {
    const normalizedQuery = normalizeText(filters.query);
    const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const to = filters.dateTo ? new Date(filters.dateTo) : null;

    return data.muestras.filter((muestra) => {
      if (filters.clienteId && muestra.clienteid !== filters.clienteId) {
        return false;
      }

      if (filters.estado && normalizeText(muestra.estado) !== normalizeText(filters.estado)) {
        return false;
      }

      if (filters.segmento && normalizeText(muestra.segmento) !== normalizeText(filters.segmento)) {
        return false;
      }

      if (filters.licencia && muestra.licencia !== filters.licencia) {
        return false;
      }

      if (filters.dima && muestra.dima !== filters.dima) {
        return false;
      }

      if (filters.variacion !== "") {
        const varFilter = filters.variacion === "si";
        if (muestra.variacion !== varFilter) {
          return false;
        }
      }

      if (filters.molderiaid && muestra.molderiaid !== filters.molderiaid) {
        return false;
      }

      if (filters.ubicacionid && muestra.ubicacionid !== filters.ubicacionid) {
        return false;
      }

      if (filters.disenadorid && muestra.disenadorid !== filters.disenadorid) {
        return false;
      }

      if (from || to) {
        const rawDate =
          muestra.fechaelaboracion ??
          muestra.fechaElaboracion ??
          muestra.createdAt ??
          muestra.createdat ??
          muestra.fecha ??
          muestra.fechaCreacion;
        const sampleDate = toDate(rawDate);
        if (!sampleDate) return false;
        if (from && sampleDate < from) return false;
        if (to) {
          const endOfDay = new Date(to);
          endOfDay.setHours(23, 59, 59, 999);
          if (sampleDate > endOfDay) return false;
        }
      }

      if (!normalizedQuery) return true;

      const clienteNombre = clienteById.get(muestra.clienteid) || "";
      const searchBlob = [
        muestra.referencia,
        muestra.modelo,
        muestra.dima,
        muestra.segmento,
        muestra.estado,
        clienteNombre,
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeText(searchBlob).includes(normalizedQuery);
    });
  }, [data.muestras, filters, clienteById]);

  const exportMuestras = () => {
    const clientesMap = catalogs.clientesMap || {};
    const molderiasMap = catalogs.molderiasMap || {};
    const ubicacionesMap = catalogs.ubicacionesMap || {};
    const disenadoresMap = catalogs.disenadoresMap || {};

    const rows = filteredMuestras.map((r) => {
      const clienteNombre = clientesMap[r.clienteid] || clienteById.get(r.clienteid) || "";
      const molderiaNombre = molderiasMap[r.molderiaid] || "";
      const ubicacionNombre = ubicacionesMap[r.ubicacionid] || "";
      const disenadorNombre = disenadoresMap[r.disenadorid] || "";

      return {
        referencia: r.referencia || "",
        segmento: r.segmento || "",
        licencia: r.licencia || "",
        dima: r.dima || "",
        fechaelaboracion:
          r.fechaelaboracion ??
          r.fechaElaboracion ??
          r.createdAt ??
          r.createdat ??
          r.fecha ??
          r.fechaCreacion ??
          "",
        estado: r.estado || "",
        variacion: formatVariacion(r.variacion),
        cliente: clienteNombre,
        molderia: molderiaNombre,
        ubicacion: ubicacionNombre,
        disenador: disenadorNombre,
      };
    });

    exportToExcel(rows, "reporte_muestras", "Muestras");
  };

  const pageSize = Number(filters.limit) || 15;
  const totalPages = Math.max(1, Math.ceil(filteredMuestras.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const limitedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMuestras.slice(start, start + pageSize);
  }, [filteredMuestras, currentPage, pageSize]);

  const totalItems = filteredMuestras.length || 0;
  const startIndex = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const { safePage, safeTotal, buttons } = buildPagination({
    page: currentPage,
    totalPages,
    maxButtons: 8,
  });

  return (
    <section className="space-y-6">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Reportes y estadísticas
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Panel ejecutivo con filtros, indicadores operativos y exportaciones listas para análisis.
          </p>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
            onClick={load}
          >
            Actualizar
          </button>
          <div className="flex flex-wrap gap-3 justify-center ml-4">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={exportMuestras}
            >
              Exportar reporte
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#1B3D8F] focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400"
            placeholder="Buscar por referencia o modelo..."
            value={filters.query}
            onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
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
          Filtros avanzados
         
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() =>
              setFilters({
                query: "",
                clienteId: "",
                estado: "",
                segmento: "",
                licencia: "",
                dima: "",
                variacion: "",
                molderiaid: "",
                ubicacionid: "",
                disenadorid: "",
                dateFrom: "",
                dateTo: "",
                limit: 15,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <FiX className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Filtros avanzados
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.clienteId}
              onChange={(event) => setFilters((prev) => ({ ...prev, clienteId: event.target.value }))}
            >
              <option value="">Todos los clientes</option>
              {data.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre || cliente.id}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.estado}
              onChange={(event) => setFilters((prev) => ({ ...prev, estado: event.target.value }))}
            >
              <option value="">Todos los estados</option>
              {estadoOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.segmento}
              onChange={(event) => setFilters((prev) => ({ ...prev, segmento: event.target.value }))}
            >
              <option value="">Todos los segmentos</option>
              {segmentoOptions.map((segmento) => (
                <option key={segmento} value={segmento}>
                  {segmento}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.licencia}
              onChange={(event) => setFilters((prev) => ({ ...prev, licencia: event.target.value }))}
            >
              <option value="">Todas las licencias</option>
              {licenciaOptions.map((licencia) => (
                <option key={licencia} value={licencia}>
                  {licencia}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.dima}
              onChange={(event) => setFilters((prev) => ({ ...prev, dima: event.target.value }))}
            >
              <option value="">Todos los DIMA</option>
              {dimaOptions.map((dima) => (
                <option key={dima} value={dima}>
                  {dima}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.variacion}
              onChange={(event) => setFilters((prev) => ({ ...prev, variacion: event.target.value }))}
            >
              <option value="">Todas las variaciones</option>
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.molderiaid}
              onChange={(event) => setFilters((prev) => ({ ...prev, molderiaid: event.target.value }))}
            >
              <option value="">Todas las molderías</option>
              {molderiasOptions.map((molderiaid) => {
                const molderiasMap = catalogs.molderiasMap || {};
                return (
                  <option key={molderiaid} value={molderiaid}>
                    {molderiasMap[molderiaid] || molderiaid}
                  </option>
                );
              })}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.ubicacionid}
              onChange={(event) => setFilters((prev) => ({ ...prev, ubicacionid: event.target.value }))}
            >
              <option value="">Todas las ubicaciones</option>
              {ubicacionesOptions.map((ubicacionid) => {
                const ubicacionesMap = catalogs.ubicacionesMap || {};
                return (
                  <option key={ubicacionid} value={ubicacionid}>
                    {ubicacionesMap[ubicacionid] || ubicacionid}
                  </option>
                );
              })}
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.disenadorid}
              onChange={(event) => setFilters((prev) => ({ ...prev, disenadorid: event.target.value }))}
            >
              <option value="">Todos los diseñadores</option>
              {disenadoresOptions.map((disenadorid) => {
                const disenadoresMap = catalogs.disenadoresMap || {};
                return (
                  <option key={disenadorid} value={disenadorid}>
                    {disenadoresMap[disenadorid] || disenadorid}
                  </option>
                );
              })}
            </select>

            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              placeholder="Desde"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />

            <input
              type="date"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              placeholder="Hasta"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </div>
        </div>
      )}

      {loading ? <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Construyendo reportes...</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p> : null}

      {!loading && !error && (
        <>
         

         

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reporte detallado de muestras</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredMuestras.length} registros encontrados con los filtros actuales.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-500">
                Mostrar
                <select
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700"
                  value={filters.limit}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, limit: Number(event.target.value) }))
                  }
                >
                  {[10, 15, 25, 50].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                filas
              </label>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-[1200px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4">referencia</th>
                    <th className="py-3 pr-4">segmento</th>
                    <th className="py-3 pr-4">licencia</th>
                    <th className="py-3 pr-4">dima</th>
                    <th className="py-3 pr-4">fechaelaboracion</th>
                    <th className="py-3 pr-4">estado</th>
                    <th className="py-3 pr-4">variacion</th>
                    <th className="py-3 pr-4">cliente</th>
                    <th className="py-3 pr-4">molderia</th>
                    <th className="py-3 pr-4">ubicacion</th>
                    <th className="py-3 pr-4">disenador</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-6 text-center text-slate-400">
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                  {limitedRows.map((muestra) => {
                    const clientesMap = catalogs.clientesMap || {};
                    const molderiasMap = catalogs.molderiasMap || {};
                    const ubicacionesMap = catalogs.ubicacionesMap || {};
                    const disenadoresMap = catalogs.disenadoresMap || {};
                    const clienteNombre = clientesMap[muestra.clienteid] || clienteById.get(muestra.clienteid) || "-";
                    const molderiaNombre = molderiasMap[muestra.molderiaid] || "-";
                    const ubicacionNombre = ubicacionesMap[muestra.ubicacionid] || "-";
                    const disenadorNombre = disenadoresMap[muestra.disenadorid] || "-";

                    return (
                      <tr key={muestra.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-semibold text-slate-900">{muestra.referencia || "-"}</td>
                        <td className="py-3 pr-4 text-slate-600">{muestra.segmento || "-"}</td>
                        <td className="py-3 pr-4 text-slate-600">{muestra.licencia || "-"}</td>
                        <td className="py-3 pr-4 text-slate-600">{muestra.dima || "-"}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          {formatDateValue(
                            muestra.fechaelaboracion ??
                              muestra.fechaElaboracion ??
                              muestra.createdAt ??
                              muestra.createdat ??
                              muestra.fecha ??
                              muestra.fechaCreacion,
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {muestra.estado || "-"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{formatVariacion(muestra.variacion)}</td>
                        <td className="py-3 pr-4 text-slate-600">{clienteNombre}</td>
                        <td className="py-3 pr-4 text-slate-600">{molderiaNombre}</td>
                        <td className="py-3 pr-4 text-slate-600">{ubicacionNombre}</td>
                        <td className="py-3 pr-4 text-slate-600">{disenadorNombre}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Page</span>

                <button
                  type="button"
                  className="ghost-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  title="Primera"
                >
                  <FiChevronsLeft />
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Anterior"
                >
                  <FiChevronLeft />
                </button>

                <div className="flex items-center gap-1">
                  {buttons.map((item) => {
                    if (typeof item === "string") {
                      return (
                        <span key={item} className="px-2 text-slate-400" aria-hidden="true">
                          …
                        </span>
                      );
                    }

                    const isActive = item === safePage;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                        className={
                          isActive
                            ? "rounded-xl bg-[#1B3D8F] px-3 py-2 text-sm font-bold text-white"
                            : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        }
                        aria-current={isActive ? "page" : undefined}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="ghost-btn"
                  disabled={safePage >= safeTotal}
                  onClick={() => setPage((p) => Math.min(safeTotal || 1, p + 1))}
                  title="Siguiente"
                >
                  <FiChevronRight />
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={safePage >= safeTotal}
                  onClick={() => setPage(safeTotal)}
                  title="Ultima"
                >
                  <FiChevronsRight />
                </button>
              </div>

              <span className="text-slate-500">
                Results {startIndex} to {endIndex} of {totalItems}
              </span>
            </div>
          </article>

          
        </>
      )}
    </section>
  );
};
