import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { exportToExcel } from "../utils/excel";
import { useCatalogData } from "../hooks/useCatalogData";
import { FiChevronsLeft, FiChevronLeft, FiChevronRight, FiChevronsRight } from "react-icons/fi";
import { buildPagination } from "../utils/pagination";

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
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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
  const [filters, setFilters] = useState({
    query: "",
    clienteId: "",
    estado: "",
    segmento: "",
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
    filters.dateFrom,
    filters.dateTo,
    filters.limit,
  ]);

  const clienteById = useMemo(
    () => new Map(data.clientes.map((item) => [item.id, item.nombre || "Cliente"])),
    [data.clientes],
  );

  const muestrasById = useMemo(() => new Map(data.muestras.map((m) => [m.id, m])), [data.muestras]);

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

  const filteredMuestraIds = useMemo(
    () => new Set(filteredMuestras.map((item) => item.id)),
    [filteredMuestras],
  );

  const filteredMovimientos = useMemo(() => {
    if (!filteredMuestraIds.size) return [];
    return data.movimientos.filter((item) => filteredMuestraIds.has(item.muestraid));
  }, [data.movimientos, filteredMuestraIds]);

  const filteredProducciones = useMemo(() => {
    if (!filteredMuestraIds.size) return [];
    return data.producciones.filter((item) => filteredMuestraIds.has(item.muestraid));
  }, [data.producciones, filteredMuestraIds]);

  const stats = useMemo(() => {
    const totalMuestras = filteredMuestras.length;
    let presentadas = 0;
    let aprobadas = 0;
    const stockMap = {};
    let entradas = 0;
    let salidas = 0;

    for (const movimiento of filteredMovimientos || []) {
      const id = movimiento.muestraid;
      const cantidad = Number(movimiento.cantidad) || 0;
      if (movimiento.tipo === "salida") {
        salidas += cantidad;
      } else {
        entradas += cantidad;
      }
      const delta = movimiento.tipo === "salida" ? -cantidad : cantidad;
      stockMap[id] = (stockMap[id] || 0) + delta;
    }

    const enBodega = Object.values(stockMap).filter((v) => v > 0).length;

    for (const muestra of filteredMuestras || []) {
      const estado = (muestra.estado || "").toString().toLowerCase();
      if (estado === "presentada") presentadas += 1;
      if (estado === "aprobada") aprobadas += 1;
    }

    return {
      totalMuestras,
      presentadas,
      aprobadas,
      enBodega,
      entradas,
      salidas,
    };
  }, [filteredMuestras, filteredMovimientos]);

  const strategic = useMemo(() => {
    const muestrasPorCliente = {};
    for (const item of filteredMuestras) {
      muestrasPorCliente[item.clienteid] =
        (muestrasPorCliente[item.clienteid] || 0) + 1;
    }

    const ventasPorCliente = {};
    for (const item of filteredProducciones) {
      ventasPorCliente[item.clienteid] =
        (ventasPorCliente[item.clienteid] || 0) +
        (Number(item.paresproducidos) || 0);
    }

    const modeloPorSegmento = {};
    for (const item of filteredMuestras) {
      modeloPorSegmento[item.segmento] =
        (modeloPorSegmento[item.segmento] || 0) + 1;
    }

    return {
      muestrasPorCliente,
      ventasPorCliente,
      modeloPorSegmento,
    };
  }, [filteredMuestras, filteredProducciones]);

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

      // copy all properties except those ending with 'id'
      const out = {};
      for (const [k, v] of Object.entries(r)) {
        if (k.toLowerCase().endsWith("id")) continue;
        out[k] = v;
      }

      // add readable names
      out.cliente = clienteNombre;
      out.molderia = molderiaNombre;
      out.ubicacion = ubicacionNombre;
      out.disenador = disenadorNombre;

      return out;
    });

    exportToExcel(rows, "reporte_muestras", "Muestras");
  };
  const exportProduccion = () => {
    const clientesMap = catalogs.clientesMap || {};
    const rows = filteredProducciones.map((r) => {
      const clienteNombre = clientesMap[r.clienteid] || clienteById.get(r.clienteid) || "";
      const out = {};
      for (const [k, v] of Object.entries(r)) {
        if (k.toLowerCase().endsWith("id")) continue;
        out[k] = v;
      }
      out.cliente = clienteNombre;
      return out;
    });
    exportToExcel(rows, "reporte_produccion", "Produccion");
  };
  const exportClientes = () =>
    exportToExcel(data.clientes, "reporte_clientes", "Clientes");
  const exportInventario = () => {
    const clientesMap = catalogs.clientesMap || {};
    const molderiasMap = catalogs.molderiasMap || {};
    const ubicacionesMap = catalogs.ubicacionesMap || {};

    const rows = filteredMovimientos.map((r) => {
      // try to get related muestra for richer info
      const muestra = muestrasById.get(r.muestraid) || null;
      const clienteNombre = clientesMap[r.clienteid] || (muestra && (clientesMap[muestra.clienteid] || clienteById.get(muestra.clienteid))) || "";
      const molderiaNombre = (muestra && molderiasMap[muestra.molderiaid]) || molderiasMap[r.molderiaid] || "";
      const ubicacionNombre = (muestra && ubicacionesMap[muestra.ubicacionid]) || ubicacionesMap[r.ubicacionid] || "";

      const out = {};
      for (const [k, v] of Object.entries(r)) {
        if (k.toLowerCase().endsWith("id")) continue;
        out[k] = v;
      }

      out.cliente = clienteNombre;
      out.molderia = molderiaNombre;
      out.ubicacion = ubicacionNombre;

      return out;
    });

    exportToExcel(rows, "reporte_inventario", "Inventario");
  };

  const stockByMuestra = useMemo(() => {
    const map = new Map();
    for (const movimiento of filteredMovimientos) {
      const current = map.get(movimiento.muestraid) || 0;
      const cantidad = Number(movimiento.cantidad) || 0;
      const delta = movimiento.tipo === "salida" ? -cantidad : cantidad;
      map.set(movimiento.muestraid, current + delta);
    }
    return map;
  }, [filteredMovimientos]);

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
      <header className="relative overflow-hidden rounded-[28px] border border-[#dbe6ff] bg-gradient-to-br from-[#0f2b63] via-[#1B3D8F] to-[#3a6bdb] p-6 text-white shadow-[0_20px_45px_rgba(16,43,96,0.32)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-20 right-16 h-52 w-52 rounded-full border border-white/10" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">
              Centro de control
            </p>
            <h1
              className="mt-2 font-serif text-[clamp(2rem,2.6vw,2.8rem)] leading-[1.05] tracking-[-0.02em]"
              style={{ fontFamily: '"Playfair Display", "Georgia", serif' }}
            >
              Reportes y estadisticas
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Panel ejecutivo con filtros, indicadores operativos y exportaciones listas para analisis.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-px hover:bg-white/20"
            onClick={load}
          >
            Actualizar
          </button>
        </div>
      </header>

      <div className="rounded-[26px] border border-slate-200 bg-white/80 p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Filtros inteligentes</h2>
            <p className="text-sm text-slate-500">Filtra por cliente, estado, segmento y rango de fechas.</p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={() =>
              setFilters({
                query: "",
                clienteId: "",
                estado: "",
                segmento: "",
                dateFrom: "",
                dateTo: "",
                limit: 15,
              })
            }
          >
            Limpiar filtros
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-7 lg:items-end">
          <label className="lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Buscar</span>
            <input
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              placeholder="Referencia, modelo, cliente..."
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
            />
          </label>

          <label className="lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Cliente</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.clienteId}
              onChange={(event) => setFilters((prev) => ({ ...prev, clienteId: event.target.value }))}
            >
              <option value="">Todos</option>
              {data.clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre || cliente.id}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Estado</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.estado}
              onChange={(event) => setFilters((prev) => ({ ...prev, estado: event.target.value }))}
            >
              <option value="">Todos</option>
              {estadoOptions.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Segmento</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.segmento}
              onChange={(event) => setFilters((prev) => ({ ...prev, segmento: event.target.value }))}
            >
              <option value="">Todos</option>
              {segmentoOptions.map((segmento) => (
                <option key={segmento} value={segmento}>
                  {segmento}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Desde</span>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.dateFrom}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            />
          </label>

          <label className="lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Hasta</span>
            <input
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-[#1B3D8F] focus:outline-none"
              value={filters.dateTo}
              onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            />
          </label>
        </div>
      </div>

      {loading ? <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">Construyendo reportes...</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p> : null}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard value={stats.totalMuestras} title="Total Muestras" subtitle="en el sistema" muted={false} />
            <KpiCard value={stats.presentadas} title="Presentadas" subtitle={`de ${stats.totalMuestras} elaboradas`} muted={false} />
            <KpiCard value={stats.aprobadas} title="Aprobadas" subtitle="total aprobadas" muted={false} />
            <KpiCard value={stats.enBodega} title="En Bodega" subtitle="disponibles a reutilizar" muted={false} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="text-base font-semibold text-slate-900">Resumen operativo</h3>
              <p className="mt-1 text-sm text-slate-500">Entradas vs salidas según movimientos filtrados.</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Entradas</span>
                  <strong className="text-[#1B3D8F]">{stats.entradas}</strong>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#1B3D8F] to-[#2f63da]"
                    style={{ width: `${Math.min((stats.entradas / Math.max(stats.entradas, stats.salidas, 1)) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Salidas</span>
                  <strong className="text-[#2f63da]">{stats.salidas}</strong>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-[#8fb8ff] to-[#2f63da]"
                    style={{ width: `${Math.min((stats.salidas / Math.max(stats.entradas, stats.salidas, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="text-base font-semibold text-slate-900">Muestras por cliente</h3>
              <p className="mt-1 text-sm text-slate-500">Top de clientes con mayor volumen.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {Object.entries(strategic.muestrasPorCliente).length === 0 && (
                  <li className="text-slate-400">Sin registros disponibles</li>
                )}
                {Object.entries(strategic.muestrasPorCliente)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([clienteid, total]) => (
                    <li key={clienteid} className="flex items-center justify-between">
                      <span className="text-slate-600">
                        {clienteById.get(clienteid) || clienteid}
                      </span>
                      <strong className="text-slate-900">{total}</strong>
                    </li>
                  ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="text-base font-semibold text-slate-900">Ventas por cliente</h3>
              <p className="mt-1 text-sm text-slate-500">Pares producidos según filtros.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {Object.entries(strategic.ventasPorCliente).length === 0 && (
                  <li className="text-slate-400">Sin registros disponibles</li>
                )}
                {Object.entries(strategic.ventasPorCliente)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([clienteid, total]) => (
                    <li key={clienteid} className="flex items-center justify-between">
                      <span className="text-slate-600">
                        {clienteById.get(clienteid) || clienteid}
                      </span>
                      <strong className="text-slate-900">{total}</strong>
                    </li>
                  ))}
              </ul>
            </article>
          </div>

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
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 pr-4">Referencia</th>
                    <th className="py-3 pr-4">Modelo</th>
                    <th className="py-3 pr-4">Cliente</th>
                    <th className="py-3 pr-4">Estado</th>
                    <th className="py-3 pr-4">Segmento</th>
                    <th className="py-3 pr-4">Fecha</th>
                    <th className="py-3 pr-4">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                  {limitedRows.map((muestra) => {
                    const rawDate =
                      muestra.fechaelaboracion ??
                      muestra.fechaElaboracion ??
                      muestra.createdAt ??
                      muestra.createdat ??
                      muestra.fecha ??
                      muestra.fechaCreacion;
                    const parsed = toDate(rawDate);
                    const stock = stockByMuestra.get(muestra.id) || 0;

                    return (
                      <tr key={muestra.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 font-semibold text-slate-900">
                          {muestra.referencia || "Sin referencia"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {muestra.modelo || "-"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {clienteById.get(muestra.clienteid) || "Sin cliente"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {muestra.estado || "Sin estado"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {muestra.segmento || "-"}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {parsed ? MONTH_FORMAT.format(parsed) : "-"}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={stock > 0 ? "font-semibold text-emerald-600" : "font-semibold text-slate-500"}>
                            {stock}
                          </span>
                        </td>
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

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={exportMuestras}
            >
              Exportar muestras
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={exportProduccion}
            >
              Exportar produccion
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={exportClientes}
            >
              Exportar clientes
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              onClick={exportInventario}
            >
              Exportar inventario
            </button>
          </div>
        </>
      )}
    </section>
  );
};
