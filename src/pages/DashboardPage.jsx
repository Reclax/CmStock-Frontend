import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import AppLoading from "../components/AppLoading";

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

  const parsed = new Date(value);
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

const formatLongDate = (value) =>
  new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);

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
    <small className={muted ? "text-slate-500" : "text-slate-600"}>
      {subtitle}
    </small>
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

const TwoLineChart = ({ firstSeries, secondSeries, firstLabel, secondLabel, muted = false }) => {
  const width = 420;
  const height = 170;
  const padding = 20;
  const maxValue = Math.max(...firstSeries, ...secondSeries, 1);

  const toPoints = (series) =>
    series
      .map((value, index) => {
        const x = padding + (index * (width - padding * 2)) / (series.length - 1);
        const y =
          height -
          padding -
          (value / maxValue) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

  const firstColor = muted ? "#94a3b8" : "#1B3D8F";
  const secondColor = muted ? "#cbd5e1" : "#4f8df2";

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full rounded-2xl border border-slate-200 bg-slate-50 p-2"
        role="img"
        aria-label="Comparativo mensual"
      >
        <polyline
          fill="none"
          stroke={firstColor}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={toPoints(firstSeries)}
        />
        <polyline
          fill="none"
          stroke={secondColor}
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={toPoints(secondSeries)}
        />
      </svg>
      <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.08em]">
        <span className={muted ? "text-slate-500" : "text-[#1B3D8F]"}>
          {firstLabel || "Muestras presentadas"}
        </span>
        <span className={muted ? "text-slate-500" : "text-[#2f63da]"}>
          {secondLabel || "Muestras vendidas"}
        </span>
      </div>
    </div>
  );
};

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

const CategoryBarsChart = ({ items, muted = false }) => {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="m-0 list-none space-y-3 p-0">
      {items.map((item, index) => {
        const widthPct = (item.value / maxValue) * 100;
        return (
          <li key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={muted ? "text-slate-500" : "text-slate-700"}>{item.label}</span>
              <strong className={muted ? "text-slate-500" : "text-slate-900"}>{item.value}</strong>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div
                className={[
                  "h-2.5 rounded-full",
                  muted
                    ? ["bg-slate-400", "bg-slate-300", "bg-slate-500"][index % 3]
                    : ["bg-[#1B3D8F]", "bg-[#2f63da]", "bg-[#7ca8ff]"][index % 3],
                ].join(" ")}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const DonutChart = ({ values, muted = false }) => {
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

          return (
            <li key={item.label} className="flex items-center gap-2 text-slate-700">
              <span className={`h-3 w-3 rounded-full ${dotPalette[index % dotPalette.length]}`} />
              <span className={muted ? "text-slate-500" : "text-slate-700"}>
                {item.label}: {item.value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

let globalDashboardCache = null;
let globalDashboardCacheTime = 0;
const CACHE_FRESHNESS_MS = 1000 * 120; // 2 minutos

export const DashboardPage = () => {
  const [loading, setLoading] = useState(!globalDashboardCache);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [data, setData] = useState(
    globalDashboardCache || {
      muestras: [],
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
        muestrasPorCliente,
        presentaciones,
        producciones,
        movimientos,
        clientes,
      ] = await Promise.all([
        fetchAllMuestras(),
        api.get(`${ENDPOINTS.muestras}/consultas/muestras-por-cliente`),
        api.get(ENDPOINTS.presentaciones),
        api.get(ENDPOINTS.producciones),
        api.get(ENDPOINTS.movimientosInventario),
        api.get(ENDPOINTS.clientes),
      ]);

      const newData = {
        muestras: toCollection(muestras),
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
      "presentada",
      "aprobada",
      "en molderia",
      "en diseno",
      "pendiente",
      "en proceso",
      "en bodega",
      "en revision",
    ];
    const estadoLabels = {
      presentada: "Presentada",
      aprobada: "Aprobada",
      "en molderia": "En molderia",
      "en diseno": "En diseño",
      pendiente: "Pendiente",
      "en proceso": "En proceso",
      "en bodega": "En bodega",
      "en revision": "En revisión",
    };

    const muestrasWithDate = [];
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
      }
    }

    const filteredMuestras = selectedYear
      ? muestrasWithDate.filter(
          (item) => item.created.getFullYear() === Number(selectedYear),
        )
      : muestrasWithDate;

    const totalMuestras = filteredMuestras.length;
    let presentadas = 0;
    let paresProducidos = 0;
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
    const monthlyPresentadas = [...EMPTY_MONTHLY];
    const monthlyProducidas = [...EMPTY_MONTHLY];
    const yearlyMap = new Map();

    for (const item of muestrasWithDate) {
      const yearKey = item.created.getFullYear();
      yearlyMap.set(yearKey, (yearlyMap.get(yearKey) || 0) + 1);
    }

    for (const item of filteredMuestras) {
      const { muestra, created } = item;
      const estadoKey = normalizeEstado(muestra.estado);
      estadoCounts.set(estadoKey, (estadoCounts.get(estadoKey) || 0) + 1);

      if (estadoKey === "presentada") {
        presentadas += 1;
      }

      monthlyMuestras[created.getMonth()] += 1;

      if (estadoKey === "presentada") {
        monthlyPresentadas[created.getMonth()] += 1;
      }

    }

    for (const produccion of data.producciones) {
      const producedPairs = Number(produccion.paresproducidos) || 0;
      const producedDate = toDate(produccion.fechaproduccion);
      paresProducidos += producedPairs;

      if (!producedDate) {
        continue;
      }

      if (
        selectedYear &&
        producedDate.getFullYear() !== Number(selectedYear)
      ) {
        continue;
      }

      monthlyProducidas[producedDate.getMonth()] += producedPairs;
    }

    const estadoItems = estadoOrder.map((estado) => ({
      label: estadoLabels[estado] || capitalize(estado),
      value: estadoCounts.get(estado) || 0,
    }));

    for (const [estado, value] of estadoCounts.entries()) {
      if (!estadoOrder.includes(estado)) {
        estadoItems.push({ label: capitalize(estado), value });
      }
    }

    const clienteNameById = new Map(
      data.clientes.map((cliente) => [cliente.id, cliente.nombre || "Cliente"]),
    );

    const clienteMap = new Map();
    for (const produccion of data.producciones) {
      if (!produccion.clienteid) {
        continue;
      }
      const producedDate = toDate(produccion.fechaproduccion);
      if (
        selectedYear &&
        (!producedDate || producedDate.getFullYear() !== Number(selectedYear))
      ) {
        continue;
      }
      const id = produccion.clienteid;
      const producedPairs = Number(produccion.paresproducidos) || 0;
      clienteMap.set(id, (clienteMap.get(id) || 0) + producedPairs);
    }

    const topClientes = Array.from(clienteMap.entries())
      .map(([id, value]) => ({
        label: clienteNameById.get(id) || `Cliente ${id.slice(0, 4)}`,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topClientesMuestras = data.muestrasPorCliente
      .map((item) => ({
        label: item.nombre || `Cliente ${String(item.id).slice(0, 4)}`,
        value: Number(item.cantidadMuestras) || 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const hasRealData = anyDataCount > 0;
    const enBodegaEstado = estadoCounts.get("en bodega") || 0;
    const otras = Math.max(
      totalMuestras - presentadas - enBodegaEstado,
      0,
    );

    const yearlyMuestras = Array.from(yearlyMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, value]) => ({ label: String(year), value }));

    return {
      hasRealData,
      totalMuestras,
      presentadas,
      paresProducidos,
      enBodegaEstado,
      otras,
      enBodega,
      monthlyMuestras,
      monthlyPresentadas,
      monthlyProducidas,
      yearlyMuestras,
      estadoItems,
      topClientes,
      topClientesMuestras,
    };
  }, [data, selectedYear]);

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
      { label: "Presentadas", value: stats.presentadas },
      { label: "Producidas", value: stats.paresProducidos },
      { label: "En bodega", value: stats.enBodegaEstado },
      { label: "Otras", value: stats.otras },
    ],
    [stats],
  );

  const currentDateLabel = useMemo(() => formatLongDate(new Date()), []);

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-xs text-slate-500">
            {currentDateLabel}
          </p>
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Dashboard estratégico
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Seguimiento de muestras, presentación, ventas y estado de bodega con lectura ejecutiva.
          </p>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
            onClick={() => load(true)}
          >
            Actualizar
          </button>
        </div>
      </header>

      {loading && <AppLoading message="Cargando panel principal..." />}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              value={stats.totalMuestras}
              title="Total Muestras"
              subtitle="en el sistema"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.presentadas}
              title="Presentadas"
              subtitle={`de ${stats.totalMuestras} elaboradas`}
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.paresProducidos}
              title="Producidas"
              subtitle="pares producidos"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={stats.enBodega}
              title="En Bodega"
              subtitle="disponibles a reutilizar"
              muted={!stats.hasRealData}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                {selectedYear ? "Muestras por mes" : "Muestras por año"}
              </h3>
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
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Distribución operativa
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <DonutChart values={donutData} muted={!stats.hasRealData} />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Presentadas vs producidas
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <TwoLineChart
                  firstSeries={stats.monthlyPresentadas}
                  secondSeries={stats.monthlyProducidas}
                  firstLabel="Muestras presentadas"
                  secondLabel="Pares producidos"
                  muted={!stats.hasRealData}
                />
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Estados de muestras
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <CategoryBarsChart
                  items={
                    stats.estadoItems.length
                      ? stats.estadoItems
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Top clientes por muestras
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <CategoryBarsChart
                  items={
                    stats.topClientesMuestras.length
                      ? stats.topClientesMuestras
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                />
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Top clientes por produccion
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <CategoryBarsChart
                  items={
                    stats.topClientes.length
                      ? stats.topClientes
                      : [{ label: "Sin registros", value: 0 }]
                  }
                  muted={!stats.hasRealData}
                />
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
};
