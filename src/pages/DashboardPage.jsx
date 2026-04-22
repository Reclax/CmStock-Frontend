import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    muestras: [],
    presentaciones: [],
    producciones: [],
    movimientos: [],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [muestras, presentaciones, producciones, movimientos] =
        await Promise.all([
          api.get(ENDPOINTS.muestras),
          api.get(ENDPOINTS.presentaciones),
          api.get(ENDPOINTS.producciones),
          api.get(ENDPOINTS.movimientosInventario),
        ]);

      setData({
        muestras: Array.isArray(muestras) ? muestras : [],
        presentaciones: Array.isArray(presentaciones) ? presentaciones : [],
        producciones: Array.isArray(producciones) ? producciones : [],
        movimientos: Array.isArray(movimientos) ? movimientos : [],
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
    const producidas = data.producciones.length;
    const noUsadas = Math.max(totalMuestras - presentadas - producidas, 0);

    const stockMap = {};
    for (const movimiento of data.movimientos) {
      const id = movimiento.muestraid;
      const cantidad = Number(movimiento.cantidad) || 0;
      const delta = movimiento.tipo === "salida" ? -cantidad : cantidad;
      stockMap[id] = (stockMap[id] || 0) + delta;
    }

    const stockTotal = Object.values(stockMap).reduce(
      (acc, value) => acc + value,
      0,
    );

    return {
      totalMuestras,
      presentadas,
      producidas,
      noUsadas,
      stockTotal,
    };
  }, [data]);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-serif text-[clamp(2rem,2.6vw,2.7rem)] leading-[1.05] tracking-[-0.03em] text-slate-900">
            Dashboard estrategico
          </h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Seguimiento de muestras, produccion e inventario en tiempo real.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-[#1b3d8f] to-[#2550b8] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(27,61,143,0.22)] transition hover:-translate-y-px"
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
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#f6fbff] p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <strong>{stats.totalMuestras}</strong>
              <span>Muestras elaboradas</span>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#fffaf5] p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <strong>{stats.presentadas}</strong>
              <span>Muestras presentadas</span>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#f7fff9] p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <strong>{stats.producidas}</strong>
              <span>Muestras producidas</span>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#fff8f8] p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <strong>{stats.noUsadas}</strong>
              <span>Muestras no utilizadas</span>
            </article>
            <article className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-[#f5f7ff] p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <strong>{stats.stockTotal}</strong>
              <span>Stock global</span>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Ultimas muestras
              </h3>
              <ul className="flex flex-col gap-2">
                {data.muestras.slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <span className="font-medium text-slate-800">
                      {item.referencia}
                    </span>
                    <small className="text-slate-500">{item.estado}</small>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(17,36,74,0.08)]">
              <h3 className="mb-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Flujo de trabajo
              </h3>
              <ol className="flex flex-col gap-2">
                {[
                  "Requerimiento del cliente",
                  "Diseno y molderia",
                  "Registro de muestra",
                  "Presentacion y aprobacion",
                  "Produccion y seguimiento",
                ].map((step, index) => (
                  <li
                    key={step}
                    className="relative rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4"
                  >
                    <span className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-b from-[#1b3d8f] to-[#2550b8] text-xs font-extrabold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </>
      )}
    </section>
  );
};
