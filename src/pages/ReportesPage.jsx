import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { exportToExcel } from "../utils/excel";

const toCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};

export const ReportesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({
    muestras: [],
    clientes: [],
    producciones: [],
    movimientos: [],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [muestras, clientes, producciones, movimientos] = await Promise.all(
        [
          api.get(ENDPOINTS.muestras),
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

  const strategic = useMemo(() => {
    const muestrasPorCliente = {};
    for (const item of data.muestras) {
      muestrasPorCliente[item.clienteid] =
        (muestrasPorCliente[item.clienteid] || 0) + 1;
    }

    const ventasPorCliente = {};
    for (const item of data.producciones) {
      ventasPorCliente[item.clienteid] =
        (ventasPorCliente[item.clienteid] || 0) +
        (Number(item.paresproducidos) || 0);
    }

    const modeloPorSegmento = {};
    for (const item of data.muestras) {
      modeloPorSegmento[item.segmento] =
        (modeloPorSegmento[item.segmento] || 0) + 1;
    }

    return {
      muestrasPorCliente,
      ventasPorCliente,
      modeloPorSegmento,
    };
  }, [data]);

  const exportMuestras = () =>
    exportToExcel(data.muestras, "reporte_muestras", "Muestras");
  const exportProduccion = () =>
    exportToExcel(data.producciones, "reporte_produccion", "Produccion");
  const exportClientes = () =>
    exportToExcel(data.clientes, "reporte_clientes", "Clientes");
  const exportInventario = () =>
    exportToExcel(data.movimientos, "reporte_inventario", "Inventario");

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Reportes y estadisticas</h1>
          <p>Consultas estrategicas, exportaciones y analitica de negocio.</p>
        </div>
        <button type="button" className="primary-btn" onClick={load}>
          Actualizar
        </button>
      </header>

      {loading ? <p className="muted-text">Construyendo reportes...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card kpi-card-a">
              <strong>{data.muestras.length}</strong>
              <span>Total muestras</span>
            </article>
            <article className="kpi-card kpi-card-b">
              <strong>{data.producciones.length}</strong>
              <span>Eventos produccion</span>
            </article>
            <article className="kpi-card kpi-card-c">
              <strong>{data.clientes.length}</strong>
              <span>Clientes activos</span>
            </article>
            <article className="kpi-card kpi-card-d">
              <strong>{data.movimientos.length}</strong>
              <span>Movimientos inventario</span>
            </article>
          </div>

          <div className="panel-grid two-col">
            <article className="panel-card">
              <h3>Muestras por cliente</h3>
              <ul className="clean-list">
                {Object.entries(strategic.muestrasPorCliente).map(
                  ([clienteid, total]) => (
                    <li key={clienteid}>
                      <span>{clienteid}</span>
                      <small>{total}</small>
                    </li>
                  ),
                )}
              </ul>
            </article>

            <article className="panel-card">
              <h3>Historial de ventas por cliente</h3>
              <ul className="clean-list">
                {Object.entries(strategic.ventasPorCliente).map(
                  ([clienteid, pares]) => (
                    <li key={clienteid}>
                      <span>{clienteid}</span>
                      <small>{pares} pares</small>
                    </li>
                  ),
                )}
              </ul>
            </article>
          </div>

          <article className="panel-card">
            <h3>Modelos por segmento</h3>
            <ul className="clean-list">
              {Object.entries(strategic.modeloPorSegmento).map(
                ([segmento, total]) => (
                  <li key={segmento}>
                    <span>{segmento || "Sin segmento"}</span>
                    <small>{total}</small>
                  </li>
                ),
              )}
            </ul>
          </article>

          <div className="button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={exportMuestras}
            >
              Exportar muestras
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={exportProduccion}
            >
              Exportar produccion
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={exportClientes}
            >
              Exportar clientes
            </button>
            <button
              type="button"
              className="secondary-btn"
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
