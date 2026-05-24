import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import AppLoading from "../components/AppLoading";
import { parseDateValue } from "../utils/format";

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const EMPTY_MONTHLY = Array.from({ length: 12 }, () => 0);
const MUESTRAS_PAGE_LIMIT = 500;

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = parseDateValue(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};


const KpiCard = ({ value, title, muted = false }) => (
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
  </article>
);

const BadgeNoData = () => (
  <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
    No data
  </span>
);

const normalizeEstado = (value) => {
  if (!value) {
    return "Sin estado";
  }

  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
};

const capitalize = (value) => {
  if (!value) {
    return "Sin estado";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const normalizePresentacionEstado = (value) => {
  return normalizeEstado(value);
};

const normalizeMuestraEstado = (value) => {
  return normalizeEstado(value);
};

const getPresentacionDate = (presentacion) =>
  toDate(
    presentacion?.fecha ??
      presentacion?.fechapresentacion ??
      presentacion?.fechaPresentacion ??
      presentacion?.createdAt ??
      presentacion?.createdat,
  );

const MuestrasBarChart = ({ data, muted = false }) => {
  const fill = muted ? "#cbd5e1" : "#1B3D8F";

  return (
    <div className="h-44 w-full rounded-2xl border border-slate-200 bg-slate-50 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={{ fontSize: 10, fill: "#64748b" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.18)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill={fill} radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const fetchPaginated = async (endpoint) => {
  let page = 1;
  let totalPages = 1;
  const allItems = [];

  while (page <= totalPages) {
    const payload = await api.get(
      `${endpoint}?page=${page}&limit=${MUESTRAS_PAGE_LIMIT}`,
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

const CategoryList = ({ items, muted = false, onSelect, activeKey }) => (
  <ul className="m-0 list-none space-y-2 p-0">
    {items.map((item) => {
      const isActive = activeKey && item.key === activeKey;
      const baseCls = muted ? "text-slate-500" : "text-slate-700";
      return (
        <li
          key={item.label}
          className="text-sm"
        >
          <button
            type="button"
            onClick={onSelect ? () => onSelect(item) : undefined}
            disabled={!onSelect || !item.key}
            className={[
              "flex w-full items-center justify-between rounded-xl px-1.5 py-1.5 text-left transition focus:outline-none focus-visible:outline-none",
              baseCls,
              onSelect && item.key
                ? "hover:bg-slate-100 hover:text-[#1B3D8F]"
                : "cursor-default",
              isActive ? "font-semibold text-[#1B3D8F] bg-slate-100" : "",
            ].join(" ")}
          >
            <span>{item.label}</span>
            <strong className={muted ? "text-slate-500" : "text-slate-900"}>{item.value}</strong>
          </button>
        </li>
      );
    })}
  </ul>
);

const PresentacionPieChart = ({ data, muted = false }) => {
  const palette = muted
    ? ["#cbd5e1", "#e2e8f0", "#94a3b8"]
    : ["#1B3D8F", "#4f8df2", "#8fb8ff"];
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!percent || percent < 0.04) {
      return null;
    }
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const rad = (-midAngle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
      >
        {`${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="h-52 w-full outline-none" style={{ outline: "none" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart tabIndex={-1} style={{ outline: "none" }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={0}
              outerRadius="85%"
              paddingAngle={2}
              animationDuration={450}
              labelLine={false}
              label={renderLabel}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.label}
                  fill={palette[index % palette.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="m-0 list-none space-y-2 p-0 text-sm">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: palette[index % palette.length] }}
            />
            <span className={muted ? "text-slate-500" : "text-slate-700"}>
              {item.label}: {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const DonutChart = ({ values, muted = false, onSelect, activeKey }) => {
  const total = values.reduce((acc, item) => acc + item.value, 0);

  if (total <= 0) {
    return (
      <div className="grid place-items-center">
        <div className="grid h-44 w-44 place-items-center rounded-full border-8 border-slate-300 bg-slate-100 text-center text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
          No data
        </div>
      </div>
    );
  }

  const palette = muted
    ? ["#d1d5db", "#cbd5e1", "#e2e8f0", "#94a3b8"]
    : ["#1B3D8F", "#2f63da", "#4f8df2", "#8fb8ff"];

  const segments = values
    .reduce(
      (acc, item, index) => {
        const start = acc.offset;
        const portion = (item.value / total) * 100;
        const end = start + portion;

        acc.offset = end;
        acc.parts.push(`${palette[index % palette.length]} ${start}% ${end}%`);
        return acc;
      },
      { offset: 0, parts: [] },
    )
    .parts.join(", ");

  return (
    <div className="grid place-items-center gap-4 sm:grid-cols-[auto_1fr] sm:items-center sm:justify-items-start">
      <div
        className="grid h-44 w-44 place-items-center rounded-full"
        style={{ background: `conic-gradient(${segments})` }}
      >
        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
          <strong className={muted ? "text-slate-500" : "text-slate-900"}>{total}</strong>
          <span className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Total</span>
        </div>
      </div>

      <ul className="m-0 list-none space-y-2 p-0 text-sm">
        {values.map((item, index) => {
          const dotPalette = muted
            ? ["bg-slate-400", "bg-slate-300", "bg-slate-500", "bg-slate-200"]
            : ["bg-[#1B3D8F]", "bg-[#2f63da]", "bg-[#4f8df2]", "bg-[#8fb8ff]"];
          const isActive = activeKey && item.key === activeKey;

          return (
            <li key={item.label} className="flex items-center gap-2 text-slate-700">
              <button
                type="button"
                onClick={onSelect ? () => onSelect(item) : undefined}
                className={[
                  "flex items-center gap-2 text-left transition focus:outline-none focus-visible:outline-none",
                  muted ? "text-slate-500" : "text-slate-700",
                  onSelect ? "hover:text-[#1B3D8F]" : "cursor-default",
                  isActive ? "font-semibold text-[#1B3D8F]" : "",
                ].join(" ")}
              >
                <span
                  className={`h-3 w-3 rounded-full ${dotPalette[index % dotPalette.length]}`}
                />
                {item.label}: {item.value}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

let globalDashboardCache = null;
let globalDashboardCacheTime = 0;
const CACHE_FRESHNESS_MS = 1000 * 30; // 30 segundos

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!globalDashboardCache);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMuestraEstado, setSelectedMuestraEstado] = useState("");
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [data, setData] = useState(
    globalDashboardCache || {
      muestras: [],
      variaciones: [],
      muestrasPorCliente: [],
      presentaciones: [],
      producciones: [],
      movimientos: [],
      clientes: [],
    }
  );

  const load = async (forceRefetch = false) => {
    if (globalDashboardCache && !forceRefetch) {
      setData(globalDashboardCache);
      setLoading(false);
      // Si el caché es muy reciente, no hacemos petición en segundo plano
      if (Date.now() - globalDashboardCacheTime < CACHE_FRESHNESS_MS) {
        return;
      }
    } else {
      setLoading(true);
    }

    setError("");
    try {
      const [
        muestras,
        variaciones,
        muestrasPorCliente,
        presentaciones,
        producciones,
        movimientos,
        clientes,
      ] = await Promise.all([
        fetchPaginated(ENDPOINTS.muestras),
        fetchPaginated(ENDPOINTS.variaciones),
        api.get(`${ENDPOINTS.muestras}/consultas/muestras-por-cliente`),
        api.get(ENDPOINTS.presentaciones),
        api.get(ENDPOINTS.producciones),
        api.get(ENDPOINTS.movimientosInventario),
        api.get(ENDPOINTS.clientes),
      ]);

      const newData = {
        muestras: toCollection(muestras),
        variaciones: toCollection(variaciones),
        muestrasPorCliente: toCollection(muestrasPorCliente),
        presentaciones: toCollection(presentaciones),
        producciones: toCollection(producciones),
        movimientos: toCollection(movimientos),
        clientes: toCollection(clientes),
      };

      globalDashboardCache = newData;
      globalDashboardCacheTime = Date.now();
      setData(newData);
    } catch (err) {
      if (!globalDashboardCache) {
        setError(err.message || "No se pudo cargar el dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const years = useMemo(() => {
    const yearSet = new Set();
    for (const muestra of data.muestras) {
      const created = toDate(
        muestra.fechaelaboracion ??
          muestra.fechaElaboracion ??
          muestra.createdAt ??
          muestra.createdat ??
          muestra.fecha ??
          muestra.fechaCreacion,
      );
      if (created) {
        yearSet.add(created.getFullYear());
      }
    }

    return Array.from(yearSet).sort((a, b) => b - a);
  }, [data.muestras]);

  const dateDiagnostics = useMemo(() => {
    let parsedDates = 0;
    const samples = [];

    for (const muestra of data.muestras) {
      const rawDate =
        muestra.fechaelaboracion ??
        muestra.fechaElaboracion ??
        muestra.createdAt ??
        muestra.createdat ??
        muestra.fecha ??
        muestra.fechaCreacion;
      const created = toDate(rawDate);
      if (created) {
        parsedDates += 1;
      } else if (samples.length < 3 && rawDate) {
        samples.push(String(rawDate));
      }
    }

    return {
      parsedDates,
      total: data.muestras.length,
      samples,
    };
  }, [data.muestras]);

  const stats = useMemo(() => {
    const estadoCounts = new Map();
    const estadoOrder = [
      "pendiente",
      "no presentado",
      "aprobada",
      "dada de baja",
    ];
    const estadoLabels = {
      pendiente: "Presentadas",
      "no presentado": "No presentadas",
      aprobada: "Aprobadas",
      "dada de baja": "Dadas de baja",
    };

    const muestrasWithDate = [];
    const muestraDateById = new Map();
    for (const muestra of data.muestras) {
      const created = toDate(
        muestra.fechaelaboracion ??
          muestra.fechaElaboracion ??
          muestra.createdAt ??
          muestra.createdat ??
          muestra.fecha ??
          muestra.fechaCreacion,
      );
      if (created) {
        muestrasWithDate.push({ muestra, created });
        muestraDateById.set(muestra.id, created);
      }
    }

    const filteredMuestras = muestrasWithDate.filter((item) => {
      if (selectedYear && item.created.getFullYear() !== Number(selectedYear)) {
        return false;
      }

      if (selectedClienteId && item.muestra.clienteid !== selectedClienteId) {
        return false;
      }

      if (selectedMuestraEstado) {
        const estadoKey = normalizeMuestraEstado(item.muestra.estado);
        if (estadoKey !== selectedMuestraEstado) {
          return false;
        }
      }

      return true;
    });

    const totalMuestras = filteredMuestras.length;
    let presentadas = 0;
    let noPresentadas = 0;
    let aprobadas = 0;
    let dadasDeBaja = 0;
    let ordenProduccion = 0;
    let dadasDeBajaProduccion = 0;
    const anyDataCount =
      totalMuestras +
      data.presentaciones.length +
      data.producciones.length +
      data.movimientos.length +
      data.clientes.length;

    const stockMap = {};
    for (const movimiento of data.movimientos) {
      const id = movimiento.muestraid;
      const cantidad = Number(movimiento.cantidad) || 0;
      const delta = movimiento.tipo === "salida" ? -cantidad : cantidad;
      stockMap[id] = (stockMap[id] || 0) + delta;
    }

    const enBodega = Object.values(stockMap).filter((value) => value > 0).length;

    const monthlyMuestras = [...EMPTY_MONTHLY];
    const yearlyMap = new Map();

    for (const item of muestrasWithDate) {
      const yearKey = item.created.getFullYear();
      yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + 1);
    }

    const variacionesWithDate = [];
    for (const variacion of data.variaciones || []) {
      const created = toDate(
        variacion.fechaelaboracion ??
          variacion.fechaElaboracion ??
          variacion.createdAt ??
          variacion.createdat ??
          variacion.fecha ??
          variacion.fechaCreacion
      );
      if (created) {
        variacionesWithDate.push({ variacion, created });
        const yearKey = created.getFullYear();
        yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + 1);
      }
    }

    const filteredVariaciones = variacionesWithDate.filter((item) => {
      if (selectedYear && item.created.getFullYear() !== Number(selectedYear)) {
        return false;
      }
      if (selectedClienteId && item.variacion.clienteid !== selectedClienteId) {
        return false;
      }
      if (selectedMuestraEstado) {
        const estadoKey = normalizeMuestraEstado(item.variacion.estado);
        if (estadoKey !== selectedMuestraEstado) {
          return false;
        }
      }
      return true;
    });

    for (const item of filteredVariaciones) {
      monthlyMuestras[item.created.getMonth()] += 1;
    }

    const produccionMuestraIds = new Set(
      data.producciones.map((produccion) => produccion.muestraid),
    );

    for (const item of filteredMuestras) {
      const { muestra, created } = item;
      const estadoKey = normalizeMuestraEstado(muestra.estado);
      estadoCounts.set(estadoKey, (estadoCounts.get(estadoKey) || 0) + 1);
      const hasProduccion = produccionMuestraIds.has(muestra.id);

      if (estadoKey === "pendiente" || estadoKey === "presentada") {
        presentadas += 1;
      }

      if (estadoKey === "no presentado") {
        noPresentadas += 1;
      }

      if (estadoKey === "aprobada") {
        aprobadas += 1;
      }

      if (estadoKey === "dada de baja") {
        dadasDeBaja += 1;
      }

      if (hasProduccion && (estadoKey === "aprobada" || estadoKey === "dada de baja")) {
        ordenProduccion += 1;
      }

      if (hasProduccion && estadoKey === "dada de baja") {
        dadasDeBajaProduccion += 1;
      }

      monthlyMuestras[created.getMonth()] += 1;
    }

    const estadoItems = estadoOrder.map((estado) => ({
      label: estadoLabels[estado] || capitalize(estado),
      value: estadoCounts.get(estado) || 0,
      key: estado,
    }));

    for (const [estado, value] of estadoCounts.entries()) {
      if (!estadoOrder.includes(estado)) {
        estadoItems.push({ label: capitalize(estado), value, key: estado });
      }
    }

    const clienteNameById = new Map(
      data.clientes.map((cliente) => [cliente.id, cliente.nombre || "Cliente"]),
    );

    const presentacionesFiltered = data.presentaciones.filter((presentacion) => {
      if (selectedClienteId && presentacion.clienteid !== selectedClienteId) {
        return false;
      }
      const created = getPresentacionDate(presentacion);
      if (selectedYear && (!created || created.getFullYear() !== Number(selectedYear))) {
        return false;
      }
      return true;
    });

    const produccionesFiltradas = data.producciones.filter((produccion) => {
      if (selectedClienteId && produccion.clienteid !== selectedClienteId) {
        return false;
      }

      if (selectedYear) {
        const created = toDate(
          produccion.fechaproduccion ??
            produccion.fechaProduccion ??
            produccion.createdAt ??
            produccion.createdat,
        );

        if (!created || created.getFullYear() !== Number(selectedYear)) {
          return false;
        }
      }

      return true;
    });

    const presentacionCounts = {
      aprobada: 0,
      pendiente: 0,
      "dada de baja": 0,
    };

    for (const presentacion of presentacionesFiltered) {
      const estadoKey = normalizePresentacionEstado(presentacion.resultado);
      presentacionCounts[estadoKey] = (presentacionCounts[estadoKey] || 0) + 1;
    }

    const presentacionItems = [
      { key: "aprobada", label: "Aprobadas", value: presentacionCounts.aprobada },
      { key: "pendiente", label: "Pendientes", value: presentacionCounts.pendiente },
      { key: "dada de baja", label: "Dadas de baja", value: presentacionCounts["dada de baja"] },
    ];

    for (const [estado, value] of Object.entries(presentacionCounts)) {
      if (value > 0 && !presentacionItems.some((item) => item.key === estado)) {
        presentacionItems.push({
          key: estado,
          label: capitalize(estado),
          value,
        });
      }
    }

    const clienteMap = new Map();
    for (const produccion of produccionesFiltradas) {
      const id = produccion.clienteid;
      if (!id) continue;
      clienteMap.set(id, (clienteMap.get(id) || 0) + 1);
    }

    const topClientes = Array.from(clienteMap.entries())
      .map(([id, value]) => ({
        label: clienteNameById.get(id) || `Cliente ${id.slice(0, 4)}`,
        key: id,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const clienteMuestrasMap = new Map();
    for (const item of filteredMuestras) {
      const id = item.muestra.clienteid;
      if (!id) continue;
      clienteMuestrasMap.set(id, (clienteMuestrasMap.get(id) || 0) + 1);
    }

    const topClientesMuestras = Array.from(clienteMuestrasMap.entries())
      .map(([id, value]) => ({
        label: clienteNameById.get(id) || `Cliente ${String(id).slice(0, 4)}`,
        key: id,
        value,
      }))
      .sort((a, b) => b.value - a.value);

    const hasRealData = anyDataCount > 0;
    const otras = Math.max(
      totalMuestras - presentadas - noPresentadas - aprobadas - dadasDeBaja,
      0,
    );

    const yearlyMuestras = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ label: String(year), value }));

    return {
      hasRealData,
      totalMuestras,
      presentadas,
      noPresentadas,
      aprobadas,
      dadasDeBaja,
      ordenProduccion,
      dadasDeBajaProduccion,
      otras,
      enBodega,
      monthlyMuestras,
      yearlyMuestras,
      estadoItems,
      topClientes,
      topClientesMuestras,
      presentacionItems,
    };
  }, [
    data,
    selectedYear,
    selectedMuestraEstado,
    selectedClienteId,
  ]);

  const monthlyItems = useMemo(
    () =>
      stats.monthlyMuestras.map((value, index) => ({
        label: MONTH_NAMES[index],
        value,
      })),
    [stats.monthlyMuestras],
  );

  const donutData = useMemo(
    () => [
      { key: "pendiente", label: "Presentadas", value: stats.presentadas },
      { key: "no presentado", label: "No presentadas", value: stats.noPresentadas },
      { key: "aprobada", label: "Aprobadas", value: stats.aprobadas },
      { key: "dada de baja", label: "Dadas de baja", value: stats.dadasDeBaja },
    ],
    [stats],
  );

  const presentacionPieData = useMemo(
    () => stats.presentacionItems || [],
    [stats.presentacionItems],
  );

  const toggleMuestraEstado = (item) => {
    if (!item?.key) return;
    setSelectedMuestraEstado((prev) => (prev === item.key ? "" : item.key));
  };

  const toggleCliente = (item) => {
    if (!item?.key) return;
    setSelectedClienteId((prev) => (prev === item.key ? "" : item.key));
  };

  const clearDashboardFilters = () => {
    setSelectedYear("");
    setSelectedMuestraEstado("");
    setSelectedClienteId("");
  };

  const hasActiveFilters = Boolean(
    selectedYear || selectedMuestraEstado || selectedClienteId,
  );

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Dashboard estratégico
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Seguimiento de muestras, presentación, ventas y estado de bodega con lectura ejecutiva.
          </p>
        </div>
      </header>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-semibold uppercase tracking-[0.08em] text-slate-500">
            Filtros activos
          </span>
          {selectedMuestraEstado && (
            <span className="rounded-full bg-white px-2 py-1 text-slate-600">
              Muestra: {capitalize(selectedMuestraEstado)}
            </span>
          )}
          {selectedYear && (
            <span className="rounded-full bg-white px-2 py-1 text-slate-600">
              Año: {selectedYear}
            </span>
          )}
          {selectedClienteId && (
            <span className="rounded-full bg-white px-2 py-1 text-slate-600">
              Cliente seleccionado
            </span>
          )}
          <button
            type="button"
            onClick={clearDashboardFilters}
            className="ml-auto rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
          >
            Limpiar
          </button>
        </div>
      )}

      {loading && <AppLoading message="Cargando panel principal..." />}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              value={stats.totalMuestras}
              title="Total Muestras"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.presentadas}
              title="Presentadas"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.noPresentadas}
              title="No presentadas"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.ordenProduccion}
              title="Orden de produccion"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.dadasDeBaja}
              title="Dadas de baja"
              muted={!stats.hasRealData}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  {selectedYear ? "Muestras por mes" : "Muestras por año"}
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/muestras")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                <label className="text-slate-500">Año</label>
                <select
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  value={selectedYear}
                  onChange={(event) => setSelectedYear(event.target.value)}
                >
                  <option value="">Todos los años</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              {stats.hasRealData && dateDiagnostics.parsedDates === 0 && (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <strong>No se pudieron leer fechas de muestras.</strong>
                  <div>Revisar campos fechaelaboracion/createdAt.</div>
                  {dateDiagnostics.samples.length > 0 && (
                    <div className="mt-1">Ejemplos: {dateDiagnostics.samples.join(", ")}</div>
                  )}
                </div>
              )}
              <div className="mt-4">
                {selectedYear ? (
                  <MuestrasBarChart
                    data={monthlyItems}
                    muted={!stats.hasRealData}
                  />
                ) : (
                  <MuestrasBarChart
                    data={stats.yearlyMuestras}
                    muted={!stats.hasRealData}
                  />
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  Distribución operativa
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/muestras")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <DonutChart
                  values={donutData}
                  muted={!stats.hasRealData}
                  onSelect={toggleMuestraEstado}
                  activeKey={selectedMuestraEstado}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  Presentaciones
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/historial")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4 pointer-events-none">
                <PresentacionPieChart
                  data={presentacionPieData}
                  muted={!stats.hasRealData}
                />
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  Estados de muestras
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/muestras")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <CategoryList
                  items={
                    stats.estadoItems.length
                      ? stats.estadoItems
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                  onSelect={toggleMuestraEstado}
                  activeKey={selectedMuestraEstado}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  Top clientes por muestras
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/reportes")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4 max-h-[220px] overflow-y-auto pr-2">
                <CategoryList
                  items={
                    stats.topClientesMuestras.length
                      ? stats.topClientesMuestras
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                  onSelect={toggleCliente}
                  activeKey={selectedClienteId}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  Top clientes por orden de produccion
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/historial")}
                  className="text-xs font-semibold uppercase tracking-[0.08em] text-[#1B3D8F] transition hover:text-[#163272] hover:underline"
                >
                  Ver mas
                </button>
              </div>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4 max-h-[220px] overflow-y-auto pr-2">
                <CategoryList
                  items={
                    stats.topClientes.length
                      ? stats.topClientes
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                  onSelect={toggleCliente}
                  activeKey={selectedClienteId}
                />
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
};
