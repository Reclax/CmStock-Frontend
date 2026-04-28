import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

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
    .toLowerCase();
};

const capitalize = (value) => {
  if (!value) {
    return "Sin estado";
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const MonthlyBarsChart = ({ series, muted = false }) => {
  const maxValue = Math.max(...series, 1);

  return (
    <div className="space-y-4">
      <div className="grid h-44 grid-cols-12 items-end gap-2">
        {series.map((value, index) => {
          const height = Math.max((value / maxValue) * 100, value > 0 ? 8 : 4);

          return (
            <div key={MONTH_NAMES[index]} className="flex flex-col items-center gap-2">
              <div
                className={[
                  "w-full rounded-t-xl transition-all duration-300",
                  muted
                    ? "bg-gradient-to-b from-slate-300 to-slate-400"
                    : "bg-gradient-to-b from-[#1B3D8F] to-[#2550b8]",
                ].join(" ")}
                style={{ height: `${height}%` }}
                aria-label={`${MONTH_NAMES[index]}: ${value}`}
              />
              <span className="text-[11px] font-semibold text-slate-500">{MONTH_NAMES[index]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TwoLineChart = ({ firstSeries, secondSeries, muted = false }) => {
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
          Muestras presentadas
        </span>
        <span className={muted ? "text-slate-500" : "text-[#2f63da]"}>
          Muestras vendidas
        </span>
      </div>
    </div>
  );
};

const InventoryBalanceChart = ({ entradas, salidas, muted = false }) => {
  const maxValue = Math.max(entradas, salidas, 1);
  const entradaPct = (entradas / maxValue) * 100;
  const salidaPct = (salidas / maxValue) * 100;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
          <span>Entradas</span>
          <strong className={muted ? "text-slate-500" : "text-[#1B3D8F]"}>{entradas}</strong>
        </div>
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className={[
              "h-3 rounded-full",
              muted ? "bg-slate-400" : "bg-gradient-to-r from-[#1B3D8F] to-[#2f63da]",
            ].join(" ")}
            style={{ width: `${entradaPct}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
          <span>Salidas</span>
          <strong className={muted ? "text-slate-500" : "text-[#2550b8]"}>{salidas}</strong>
        </div>
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className={[
              "h-3 rounded-full",
              muted ? "bg-slate-300" : "bg-gradient-to-r from-[#7ca8ff] to-[#2550b8]",
            ].join(" ")}
            style={{ width: `${salidaPct}%` }}
          />
        </div>
      </div>
    </div>
  );
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

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    muestras: [],
    presentaciones: [],
    producciones: [],
    movimientos: [],
    clientes: [],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [muestras, presentaciones, producciones, movimientos, clientes] =
        await Promise.all([
          api.get(ENDPOINTS.muestras),
          api.get(ENDPOINTS.presentaciones),
          api.get(ENDPOINTS.producciones),
          api.get(ENDPOINTS.movimientosInventario),
          api.get(ENDPOINTS.clientes),
        ]);

      setData({
        muestras: toCollection(muestras),
        presentaciones: toCollection(presentaciones),
        producciones: toCollection(producciones),
        movimientos: toCollection(movimientos),
        clientes: toCollection(clientes),
      });
    } catch (err) {
      setError(err.message || "No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const totalMuestras = data.muestras.length;
    const presentadas = data.presentaciones.length;
    const vendidas = data.producciones.length;
    const anyDataCount =
      totalMuestras +
      presentadas +
      vendidas +
      data.movimientos.length +
      data.clientes.length;

    const stockMap = {};
    let entradas = 0;
    let salidas = 0;
    for (const movimiento of data.movimientos) {
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

    const enBodega = Object.values(stockMap).filter((value) => value > 0).length;

    const tasaAprobacion = totalMuestras
      ? Math.round((presentadas / totalMuestras) * 100)
      : 0;

    const currentYear = new Date().getFullYear();
    const monthlyMuestras = [...EMPTY_MONTHLY];
    const monthlyPresentadas = [...EMPTY_MONTHLY];
    const monthlyVendidas = [...EMPTY_MONTHLY];

    for (const muestra of data.muestras) {
      const created = toDate(
        muestra.fechaelaboracion ??
          muestra.fechaElaboracion ??
          muestra.createdAt ??
          muestra.createdat ??
          muestra.fecha ??
          muestra.fechaCreacion,
      );

      if (!created || created.getFullYear() !== currentYear) {
        continue;
      }

      monthlyMuestras[created.getMonth()] += 1;
    }

    for (const presentacion of data.presentaciones) {
      const created = toDate(presentacion.fecha ?? presentacion.createdat ?? presentacion.createdAt);
      if (!created || created.getFullYear() !== currentYear) {
        continue;
      }
      monthlyPresentadas[created.getMonth()] += 1;
    }

    for (const produccion of data.producciones) {
      const created = toDate(
        produccion.fechaproduccion ?? produccion.fecha ?? produccion.createdat ?? produccion.createdAt,
      );
      if (!created || created.getFullYear() !== currentYear) {
        continue;
      }
      monthlyVendidas[created.getMonth()] += 1;
    }

    const estadoMap = new Map();
    for (const muestra of data.muestras) {
      const estadoKey = normalizeEstado(muestra.estado);
      estadoMap.set(estadoKey, (estadoMap.get(estadoKey) || 0) + 1);
    }

    const estadoItems = Array.from(estadoMap.entries())
      .map(([estado, value]) => ({ label: capitalize(estado), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const clienteNameById = new Map(
      data.clientes.map((cliente) => [cliente.id, cliente.nombre || "Cliente"]),
    );

    const clienteMap = new Map();
    for (const muestra of data.muestras) {
      if (!muestra.clienteid) {
        continue;
      }
      clienteMap.set(muestra.clienteid, (clienteMap.get(muestra.clienteid) || 0) + 1);
    }

    const topClientes = Array.from(clienteMap.entries())
      .map(([id, value]) => ({
        label: clienteNameById.get(id) || `Cliente ${id.slice(0, 4)}`,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const hasRealData = anyDataCount > 0;

    return {
      hasRealData,
      totalMuestras,
      presentadas,
      vendidas,
      tasaAprobacion,
      enBodega,
      entradas,
      salidas,
      monthlyMuestras,
      monthlyPresentadas,
      monthlyVendidas,
      estadoItems,
      topClientes,
    };
  }, [data]);

  const donutData = useMemo(
    () => [
      { label: "Elaboradas", value: stats.totalMuestras },
      { label: "Presentadas", value: stats.presentadas },
      { label: "Vendidas", value: stats.vendidas },
      { label: "En bodega", value: stats.enBodega },
    ],
    [stats],
  );

  const currentDateLabel = useMemo(() => formatLongDate(new Date()), []);

  return (
    <section className="space-y-5">
      <header className="relative overflow-hidden rounded-[30px] border border-[#d9e5ff] bg-gradient-to-br from-[#14306d] via-[#1B3D8F] to-[#2f63da] p-6 text-white shadow-[0_20px_45px_rgba(16,43,96,0.34)] sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/20" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-44 w-44 rounded-full border border-white/10" />

        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/75">
            Resumen del año en curso · {currentDateLabel}
          </p>
          <h1 className="mt-3 font-serif text-[clamp(2rem,2.8vw,2.9rem)] leading-[1.02] tracking-[-0.03em] text-white">
            Dashboard estratégico
          </h1>
          <p className="mt-2 max-w-3xl text-white/80">
            Seguimiento de muestras, presentación, ventas y estado de bodega con lectura ejecutiva.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:-translate-y-px hover:bg-white/20"
          onClick={load}
        >
          Actualizar
        </button>
      </header>

      {loading && <p className="text-slate-500">Cargando indicadores...</p>}
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
              value={stats.vendidas}
              title="Vendidas"
              subtitle="órdenes confirmadas"
              muted={!stats.hasRealData}
            />
            <KpiCard
              value={`${stats.tasaAprobacion}%`}
              title="Tasa Aprobación"
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
                Muestras por mes
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <MonthlyBarsChart
                  series={stats.monthlyMuestras}
                  muted={!stats.hasRealData}
                />
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
                Presentadas vs vendidas
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <TwoLineChart
                  firstSeries={stats.monthlyPresentadas}
                  secondSeries={stats.monthlyVendidas}
                  muted={!stats.hasRealData}
                />
              </div>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Balance de inventario
              </h3>
              {!stats.hasRealData && <BadgeNoData />}
              <div className="mt-4">
                <InventoryBalanceChart
                  entradas={stats.entradas}
                  salidas={stats.salidas}
                  muted={!stats.hasRealData}
                />
              </div>
            </article>

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
