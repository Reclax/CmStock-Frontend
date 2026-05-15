import { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCamera,
  FiInfo,
  FiMapPin,
  FiUserX,
} from "react-icons/fi";
import { useParams } from "react-router-dom";
import { api, API_ROOT_URL } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { useCatalogData } from "../hooks/useCatalogData";

export const MuestraDetailPage = () => {
  const { muestraId } = useParams();
  const catalogs = useCatalogData();
  const [muestra, setMuestra] = useState(null);
  const [ubicacion, setUbicacion] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [molderia, setMolderia] = useState(null);
  const [disenador, setDisenador] = useState(null);
  const [fotos, setFotos] = useState([]);
  const [presentaciones, setPresentaciones] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFotos, setLoadingFotos] = useState(false);
  const [loadingPresentaciones, setLoadingPresentaciones] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError("");

        // Cargar muestra (principal - si falla, mostrar error)
        const muestraData = await api.get(`${ENDPOINTS.muestras}/${muestraId}`);
        setMuestra(muestraData);

        // Cargar ubicación (no es crítico si falla)
        if (muestraData.ubicacionid) {
          try {
            const ubicacionData = await api.get(
              `${ENDPOINTS.ubicaciones}/${muestraData.ubicacionid}`,
            );
            setUbicacion(ubicacionData);
          } catch (err) {
            console.warn("No se pudo cargar ubicación:", err.message);
          }
        }

        // Cargar cliente (no es crítico si falla)
        if (muestraData.clienteid) {
          try {
            const clienteData = await api.get(
              `${ENDPOINTS.clientes}/${muestraData.clienteid}`,
            );
            setCliente(clienteData);
          } catch (err) {
            console.warn("No se pudo cargar cliente:", err.message);
          }
        }

        // Cargar molderia (no es crítico si falla)
        if (muestraData.molderiaid) {
          try {
            const molderiaData = await api.get(
              `${ENDPOINTS.molderias}/${muestraData.molderiaid}`,
            );
            setMolderia(molderiaData);
          } catch (err) {
            console.warn("No se pudo cargar moldería:", err.message);
          }
        }

        // Cargar diseñador (no es crítico si falla)
        if (muestraData.disenadorid) {
          try {
            const disenadorData = await api.get(
              `${ENDPOINTS.usuarios}/${muestraData.disenadorid}`,
            );
            setDisenador(disenadorData);
          } catch (err) {
            console.warn("No se pudo cargar diseñador:", err.message);
          }
        }

        // Cargar fotos (no es crítico si falla)
        try {
          setLoadingFotos(true);
          const fotosData = await api.get(
            `${ENDPOINTS.fotos}?muestraid=${muestraId}`,
          );
          setFotos(Array.isArray(fotosData) ? fotosData : []);
        } catch (err) {
          console.warn("No se pudo cargar fotos:", err.message);
          setFotos([]);
        } finally {
          setLoadingFotos(false);
        }

        // Cargar presentaciones (no es crítico si falla)
        try {
          setLoadingPresentaciones(true);
          const presData = await api.get(
            `${ENDPOINTS.muestras}/${muestraId}/presentaciones`,
          );
          setPresentaciones(Array.isArray(presData) ? presData : []);
        } catch (err) {
          console.warn("No se pudo cargar presentaciones:", err.message);
          setPresentaciones([]);
        } finally {
          setLoadingPresentaciones(false);
        }

        // Cargar clientes (no es crítico si falla)
        try {
          const clientesData = await api.get(ENDPOINTS.clientes);
          setClientes(Array.isArray(clientesData) ? clientesData : []);
        } catch (err) {
          console.warn("No se pudo cargar clientes:", err.message);
          setClientes([]);
        }
      } catch (err) {
        setError(
          err.message || "No se pudo cargar la información de la muestra",
        );
        console.error("Error cargando datos:", err);
      } finally {
        setLoading(false);
      }
    };

    if (muestraId) {
      loadData();
    }
  }, [muestraId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#1B3D8F]"></div>
          <p className="text-slate-600">
            Cargando información de la muestra...
          </p>
        </div>
      </div>
    );
  }

  if (error || !muestra) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <FiAlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-600" />
          <h1 className="mb-2 text-xl font-bold text-red-900">Error</h1>
          <p className="text-red-700">
            {error || "No se encontró la muestra solicitada"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#1B3D8F] uppercase tracking-wide">
              Detalle de Muestra
            </p>
            <h1 className="text-4xl font-bold text-slate-900">
              {muestra.referencia}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Estado
              </p>
              <p className="mt-1 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                {muestra.estado || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Licenciado
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {muestra.licenciado ? "Sí" : "No"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">
                Diseñador
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {typeof muestra.disenador === "object" &&
                muestra.disenador?.nombre
                  ? muestra.disenador.nombre
                  : typeof muestra.disenador === "string" &&
                      muestra.disenador.trim() !== ""
                    ? muestra.disenador
                    : catalogs.disenadoresMap?.[muestra.disenadorid] || "-"}
              </p>
            </div>
          </div>
        </header>

        {/* Fotos */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">Fotos</h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B3D8F] text-xs font-black text-white">
              {fotos.length}
            </span>
          </div>
          {loadingFotos ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
              Cargando fotos...
            </div>
          ) : fotos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <FiCamera className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-400">
                Sin fotos registradas
              </p>
              <p className="text-xs text-slate-400">
                Esta muestra no tiene fotos cargadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {fotos.map((foto) => (
                <a
                  key={foto.id}
                  href={`${API_ROOT_URL}${foto.urlarchivo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm transition hover:shadow-md"
                >
                  <img
                    src={`${API_ROOT_URL}${foto.urlarchivo}`}
                    alt="Foto muestra"
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition duration-200 group-hover:bg-black/20">
                    <span className="text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      Ver
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Información de Muestra */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Información de la Muestra
          </h2>

          {/* Grid 1: Información Básica */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">
              Datos Básicos
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Referencia
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.referencia}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Segmento
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.segmento || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Talla
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.talla || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Pares Elaborados
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.pareselaborados ?? 0}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  DIMA
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.dima || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Grid 2: Catálogos */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">
              Referencias
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {cliente && (
                <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-purple-50 to-white p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase">
                    Cliente
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {cliente.nombre}
                  </p>
                </div>
              )}
              {molderia && (
                <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase">
                    Moldería
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {molderia.nombre}
                  </p>
                </div>
              )}
              {(disenador || muestra.disenador || muestra.disenadorid) && (
                <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-cyan-50 to-white p-4">
                  <p className="text-xs font-semibold text-slate-600 uppercase">
                    Diseñador
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {typeof muestra.disenador === "object" &&
                    muestra.disenador?.nombre
                      ? muestra.disenador.nombre
                      : typeof muestra.disenador === "string" &&
                          muestra.disenador.trim() !== ""
                        ? muestra.disenador
                        : catalogs.disenadoresMap?.[muestra.disenadorid] ||
                          disenador?.nombre ||
                          "-"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Grid 3: Fechas y Estado */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-700">
              Histórico
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Fecha de Elaboración
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.fechaelaboracion
                    ? new Date(muestra.fechaelaboracion).toLocaleDateString(
                        "es-CO",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Estado
                </p>
                <p className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {muestra.estado || "-"}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Proceso
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  {muestra.proceso || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {muestra.observaciones && (
            <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4">
              <div className="flex gap-3">
                <FiInfo className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Observaciones
                  </p>
                  <p className="mt-1 text-sm text-blue-800">
                    {muestra.observaciones}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Presentaciones */}
        <section className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-slate-200">
          <div className="mb-6 flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Presentaciones
            </h2>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B3D8F] text-xs font-black text-white">
              {presentaciones.length}
            </span>
          </div>
          {loadingPresentaciones ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-200 border-t-[#1B3D8F]" />
              Cargando presentaciones...
            </div>
          ) : presentaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <p className="text-sm font-semibold text-slate-400">
                Sin presentaciones
              </p>
              <p className="text-xs text-slate-400">
                Esta muestra aún no ha sido presentada a clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {presentaciones.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {p.cliente?.nombre ||
                          p.clienteid ||
                          "Cliente desconocido"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Fecha: {p.fecha?.slice(0, 10) || "—"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          p.resultado === "aprobada"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : p.resultado === "rechazada"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                        }`}
                      >
                        {p.resultado || "Pendiente"}
                      </span>
                      {p.derivoproduccion && (
                        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                          Derivó a producción
                        </span>
                      )}
                    </div>
                  </div>
                  {(p.paresaprobados || p.paresrechazados) && (
                    <div className="mt-3 flex gap-4 text-xs text-slate-600">
                      {p.paresaprobados && (
                        <span>✓ {p.paresaprobados} aprobados</span>
                      )}
                      {p.paresrechazados && (
                        <span>✗ {p.paresrechazados} rechazados</span>
                      )}
                    </div>
                  )}
                  {p.observaciones && (
                    <p className="mt-3 text-xs text-slate-500">
                      {p.observaciones}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Clientes sin presentación */}
        {clientes.length > 0 && (
          <section className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-slate-200">
            <div className="mb-6 flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">
                Clientes sin presentación
              </h2>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white ${(() => {
                  const presentadosIds = new Set(
                    presentaciones.map((p) => p.clienteid),
                  );
                  const noPresentados = clientes.filter(
                    (c) => !presentadosIds.has(c.id),
                  );
                  return noPresentados.length === 0
                    ? "bg-emerald-500"
                    : "bg-amber-500";
                })()}`}
              >
                {(() => {
                  const presentadosIds = new Set(
                    presentaciones.map((p) => p.clienteid),
                  );
                  const noPresentados = clientes.filter(
                    (c) => !presentadosIds.has(c.id),
                  );
                  return noPresentados.length;
                })()}
              </span>
            </div>
            {(() => {
              const presentadosIds = new Set(
                presentaciones.map((p) => p.clienteid),
              );
              const noPresentados = clientes.filter(
                (c) => !presentadosIds.has(c.id),
              );
              return noPresentados.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <span className="text-emerald-600">✓</span>
                  <p className="text-sm font-semibold text-emerald-700">
                    Presentada a todos los clientes registrados.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {noPresentados.map((c) => (
                    <div
                      key={c.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2"
                    >
                      <FiUserX className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-800 leading-tight">
                          {c.nombre}
                        </p>
                        {c.region && (
                          <p className="text-[10px] text-amber-600 leading-tight">
                            {c.region}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        {/* Ubicación en Bodega */}
        {ubicacion && (
          <section className="mb-8 rounded-lg bg-white p-6 shadow-sm border border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="mb-4 flex items-center gap-3">
              <FiMapPin className="h-6 w-6 text-[#1B3D8F]" />
              <h2 className="text-2xl font-bold text-slate-900">
                Ubicación en Bodega
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Ubicación
                </p>
                <p className="mt-2 text-2xl font-bold text-[#1B3D8F]">
                  {ubicacion.nombre}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Tipo
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-900">
                  {ubicacion.tipo || "-"}
                </p>
              </div>
            </div>
            {ubicacion.descripcion && (
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase">
                  Descripción
                </p>
                <p className="mt-2 text-slate-700">{ubicacion.descripcion}</p>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="rounded-lg bg-slate-900 p-6 text-center text-slate-400">
          <p className="text-sm">
            Muestra ID:{" "}
            <span className="font-mono text-xs text-slate-500">
              {muestra.id}
            </span>
          </p>
          <p className="mt-2 text-xs">
            CmStock © 2026 - Sistema de Control de Muestras
          </p>
        </footer>
      </div>
    </div>
  );
};
