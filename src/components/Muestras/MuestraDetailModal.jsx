import { FiCamera, FiEdit2, FiEye, FiPlus, FiPrinter } from "react-icons/fi";
import { Modal } from "../Modal";
import { EstadoBadge } from "./MuestrasUI";
import { esMuestraVariacion, formatearReferenciaVariacion, safe } from "./MuestrasUtils";
import { API_ROOT_URL } from "../../api/client";

export const MuestraDetailModal = ({
  viewRow,
  setViewRow,
  openEditFromDetail,
  viewPhotos,
  loadingViewPhotos,
  catalogs,
  presentaciones,
  loadingPres,
  setPresentacionForm,
  setPresentacionModalOpen,
  setEditingPresentacion,
  variacionesAnexadas,
  loadingVariaciones,
  openView,
  qrUrl,
  qrLink
}) => {
  return (
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
            {esMuestraVariacion(viewRow) ? "Editar variación" : "Editar muestra"}
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
                catalogs.molderiasMap?.[viewRow.molderiaid] ?? viewRow.molderia,
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
                catalogs.clientesMap?.[viewRow.clienteid] ?? viewRow.clienteid,
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
                typeof viewRow.disenador === "object" && viewRow.disenador?.nombre
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
                    aprobada: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    producida: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    rechazada: "bg-rose-50 text-rose-700 border-rose-200",
                    pendiente: "bg-orange-50 text-orange-700 border-orange-200",
                    parcial: "bg-amber-50 text-amber-700 border-amber-200",
                    revisar: "bg-violet-50 text-violet-700 border-violet-200",
                  }[p.resultado] ?? "bg-slate-50 text-slate-600 border-slate-200";
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
                          {p.cliente?.region ? `Región: ${p.cliente.region} · ` : ""}
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
            const presentadosIds = new Set(presentaciones.map((p) => p.clienteid));
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
                            : safe(catalogs.molderiasMap?.[v.molderiaid]) !== "—"
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
  );
};
