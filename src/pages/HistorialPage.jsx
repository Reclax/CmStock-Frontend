import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import Select from "react-select";
import {
  FiChevronsLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsRight,
  FiAlertTriangle,
  FiPlus,
} from "react-icons/fi";
import { buildPagination } from "../utils/pagination";

const PAGE_SIZE = 20;

const tabs = [
  { key: "presentaciones", label: "Presentaciones" },
  { key: "producciones", label: "Producciones" },
  { key: "trazabilidades", label: "Trazabilidad" },
];

export const HistorialPage = () => {
  const catalogs = useCatalogData();
  const presentaciones = useCrud(ENDPOINTS.presentaciones);
  const producciones = useCrud(ENDPOINTS.producciones);
  const trazabilidades = useCrud(ENDPOINTS.trazabilidades);
  const muestras = useCrud(ENDPOINTS.muestras);

  const [tab, setTab] = useState("presentaciones");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [rowToDelete, setRowToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const { load: loadPresentaciones } = presentaciones;
  const { load: loadProducciones } = producciones;
  const { load: loadTrazabilidades } = trazabilidades;
  const { load: loadMuestras } = muestras;

  useEffect(() => {
    loadPresentaciones();
    loadProducciones();
    loadTrazabilidades();
    loadMuestras();
  }, [loadPresentaciones, loadProducciones, loadTrazabilidades, loadMuestras]);

  const services = { presentaciones, producciones, trazabilidades };
  const service = services[tab];

  useEffect(() => {
    setPage(1);
    setRowToDelete(null);
  }, [tab]);

  const totalPages = Math.ceil((service.items?.length || 0) / PAGE_SIZE);

  useEffect(() => {
    if (!totalPages) {
      setPage(1);
      return;
    }
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return (service.items || []).slice(start, start + PAGE_SIZE);
  }, [service.items, page]);

  const totalItems = service.items?.length || 0;
  const startIndex = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, totalItems);

  const { safePage, safeTotal, buttons } = buildPagination({
    page,
    totalPages,
    maxButtons: 8,
  });

  const openForm = (row = null) => {
    setEditing(row);
    setForm(row ? { ...row } : {});
    setModalOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setForm({});
    setModalOpen(false);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    let payload = { ...form };

    if (tab === "presentaciones") {
      payload = {
        ...payload,
        paresaprobados: toNumber(payload.paresaprobados),
        paresrechazados: toNumber(payload.paresrechazados),
        derivoproduccion: Boolean(payload.derivoproduccion),
      };
    }

    if (tab === "producciones") {
      payload = {
        ...payload,
        paresproducidos: toNumber(payload.paresproducidos) || 0,
      };
    }

    if (editing) {
      await service.update(editing.id, payload);
    } else {
      await service.create(payload);
    }

    closeForm();
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    await service.remove(rowToDelete.id);
    setRowToDelete(null);
  };

  const disenadorIds = useMemo(() => {
    return Array.from(
      new Set(
        trazabilidades.items.map((item) => item.disenadorid).filter(Boolean),
      ),
    );
  }, [trazabilidades.items]);

  const modeladorIds = useMemo(() => {
    return Array.from(
      new Set(
        trazabilidades.items.map((item) => item.modeladorid).filter(Boolean),
      ),
    );
  }, [trazabilidades.items]);

  const muestrasMap = useMemo(() => {
    return Object.fromEntries(
      muestras.items.map((item) => [item.id, item.referencia]),
    );
  }, [muestras.items]);

  const getMuestraLabel = (row) =>
    row.muestra?.referencia || muestrasMap[row.muestraid] || row.muestraid;

  const columnsByTab = {
    presentaciones: [
      { key: "muestraid", label: "Referencia", render: getMuestraLabel },
      {
        key: "clienteid",
        label: "Cliente",
        render: (row) => catalogs.clientesMap[row.clienteid] || row.clienteid,
      },
      { key: "fecha", label: "Fecha", render: (row) => toDateInput(row.fecha) },
      { key: "resultado", label: "Resultado" },
      { key: "paresaprobados", label: "Aprobados" },
      { key: "paresrechazados", label: "Rechazados" },
      {
        key: "derivoproduccion",
        label: "Derivo",
        render: (row) => (row.derivoproduccion ? "Si" : "No"),
      },
    ],
    producciones: [
      { key: "ordennumero", label: "Orden" },
      { key: "muestraid", label: "Referencia", render: getMuestraLabel },
      {
        key: "clienteid",
        label: "Cliente",
        render: (row) => catalogs.clientesMap[row.clienteid] || row.clienteid,
      },
      { key: "paresproducidos", label: "Pares" },
      {
        key: "fechaproduccion",
        label: "Fecha",
        render: (row) => toDateInput(row.fechaproduccion),
      },
      { key: "mes", label: "Mes" },
    ],
    trazabilidades: [
      { key: "muestraid", label: "Referencia", render: getMuestraLabel },
      { key: "disenadorid", label: "Disenador" },
      { key: "modeladorid", label: "Modelador" },
      {
        key: "fecharequerimiento",
        label: "Req",
        render: (row) => toDateInput(row.fecharequerimiento),
      },
      {
        key: "fechadiseno",
        label: "Diseno",
        render: (row) => toDateInput(row.fechadiseno),
      },
      {
        key: "fechamolderia",
        label: "Molderia",
        render: (row) => toDateInput(row.fechamolderia),
      },
      {
        key: "fecharegistro",
        label: "Registro",
        render: (row) => toDateInput(row.fecharegistro),
      },
    ],
  };

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Historial y trazabilidad
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Control de presentaciones, producción y fases del flujo de muestra.
          </p>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
            onClick={() => openForm()}
          >
            <FiPlus className="h-4 w-4" /> Nuevo registro
          </button>
        </div>
      </header>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
              tab === item.key
                ? "bg-white text-[#1B3D8F] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <DataGrid
            columns={columnsByTab[tab]}
            rows={paginatedRows}
            onEdit={openForm}
            onDelete={(row) => setRowToDelete(row)}
            minWidthClass="min-w-full"
            containerClassName="shadow-none"
          />
        </div>

        <div className="border-t border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-sm">
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
                    <span
                      key={item}
                      className="px-2 text-slate-400"
                      aria-hidden="true"
                    >
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

      {rowToDelete && (
        <Modal title="Confirmar eliminacion" onClose={() => setRowToDelete(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <FiAlertTriangle className="mt-0.5" />
              <div>
                <p className="m-0 font-semibold">Esta accion no se puede deshacer.</p>
                <p className="m-0 text-sm">Se eliminara el registro seleccionado.</p>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setRowToDelete(null)}
              >
                Cancelar
              </button>
              <button type="button" className="secondary-btn" onClick={confirmDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Editar registro" : "Nuevo registro"}
          onClose={closeForm}
        >
          <form onSubmit={onSubmit} className="space-y-6">
            {tab === "presentaciones" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Muestra *</span>
                    <Select
                      options={muestras.items.map((item) => ({
                        value: item.id,
                        label: item.referencia,
                      }))}
                      value={
                        form.muestraid
                          ? {
                              value: form.muestraid,
                              label:
                                muestras.items.find(
                                  (m) => m.id === form.muestraid,
                                )?.referencia || form.muestraid,
                            }
                          : null
                      }
                      onChange={(option) =>
                        onChange("muestraid", option?.value || "")
                      }
                      isClearable
                      isSearchable
                      placeholder="Buscar por referencia..."
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          borderColor: "#cbd5e1",
                          fontSize: "0.875rem",
                          minHeight: "2.625rem",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#1B3D8F"
                            : state.isFocused
                              ? "#f1f5f9"
                              : "white",
                          color: state.isSelected ? "white" : "#1f2937",
                          cursor: "pointer",
                        }),
                        menuList: (base) => ({
                          ...base,
                          maxHeight: "200px",
                        }),
                      }}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Cliente *</span>
                    <select
                      required
                      value={form.clienteid || ""}
                      onChange={(event) =>
                        onChange("clienteid", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    >
                      <option value="">Selecciona</option>
                      {catalogs.clientes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fecha)}
                      onChange={(event) => onChange("fecha", event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Resultado *</span>
                    <select
                      required
                      value={form.resultado || ""}
                      onChange={(event) =>
                        onChange("resultado", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    >
                      <option value="">Selecciona</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Rechazado">Rechazado</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Revisar">Revisar</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Pares aprobados</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.paresaprobados || ""}
                      onChange={(event) =>
                        onChange("paresaprobados", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Pares rechazados</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.paresrechazados || ""}
                      onChange={(event) =>
                        onChange("paresrechazados", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={Boolean(form.derivoproduccion)}
                    onChange={(event) =>
                      onChange("derivoproduccion", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F]"
                  />
                  <span className="text-sm font-medium text-slate-700">Derivó en producción</span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">Observaciones</span>
                  <textarea
                    rows="3"
                    placeholder="Notas o comentarios adicionales..."
                    value={form.observaciones || ""}
                    onChange={(event) =>
                      onChange("observaciones", event.target.value)
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                  />
                </label>
              </div>
            )}

            {tab === "producciones" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Muestra *</span>
                    <Select
                      options={muestras.items.map((item) => ({
                        value: item.id,
                        label: item.referencia,
                      }))}
                      value={
                        form.muestraid
                          ? {
                              value: form.muestraid,
                              label:
                                muestras.items.find(
                                  (m) => m.id === form.muestraid,
                                )?.referencia || form.muestraid,
                            }
                          : null
                      }
                      onChange={(option) =>
                        onChange("muestraid", option?.value || "")
                      }
                      isClearable
                      isSearchable
                      placeholder="Buscar por referencia..."
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          borderColor: "#cbd5e1",
                          fontSize: "0.875rem",
                          minHeight: "2.625rem",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#1B3D8F"
                            : state.isFocused
                              ? "#f1f5f9"
                              : "white",
                          color: state.isSelected ? "white" : "#1f2937",
                          cursor: "pointer",
                        }),
                        menuList: (base) => ({
                          ...base,
                          maxHeight: "200px",
                        }),
                      }}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Cliente *</span>
                    <select
                      required
                      value={form.clienteid || ""}
                      onChange={(event) =>
                        onChange("clienteid", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    >
                      <option value="">Selecciona</option>
                      {catalogs.clientes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Orden producción *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej: OP-2026-001"
                      value={form.ordennumero || ""}
                      onChange={(event) =>
                        onChange("ordennumero", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Pares producidos *</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="1"
                      value={form.paresproducidos || ""}
                      onChange={(event) =>
                        onChange("paresproducidos", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha producción *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fechaproduccion)}
                      onChange={(event) =>
                        onChange("fechaproduccion", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Mes *</span>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Mayo 2026"
                      value={form.mes || ""}
                      onChange={(event) => onChange("mes", event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>
                </div>
              </div>
            )}

            {tab === "trazabilidades" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Muestra *</span>
                    <Select
                      options={muestras.items.map((item) => ({
                        value: item.id,
                        label: item.referencia,
                      }))}
                      value={
                        form.muestraid
                          ? {
                              value: form.muestraid,
                              label:
                                muestras.items.find(
                                  (m) => m.id === form.muestraid,
                                )?.referencia || form.muestraid,
                            }
                          : null
                      }
                      onChange={(option) =>
                        onChange("muestraid", option?.value || "")
                      }
                      isClearable
                      isSearchable
                      placeholder="Buscar por referencia..."
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: "0.5rem",
                          borderColor: "#cbd5e1",
                          fontSize: "0.875rem",
                          minHeight: "2.625rem",
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? "#1B3D8F"
                            : state.isFocused
                              ? "#f1f5f9"
                              : "white",
                          color: state.isSelected ? "white" : "#1f2937",
                          cursor: "pointer",
                        }),
                        menuList: (base) => ({
                          ...base,
                          maxHeight: "200px",
                        }),
                      }}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Diseñador ID *</span>
                    <input
                      list="hist-disenadores"
                      type="text"
                      required
                      placeholder="ID del diseñador"
                      value={form.disenadorid || ""}
                      onChange={(event) =>
                        onChange("disenadorid", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                    <datalist id="hist-disenadores">
                      {disenadorIds.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Modelador ID *</span>
                    <input
                      list="hist-modeladores"
                      type="text"
                      required
                      placeholder="ID del modelador"
                      value={form.modeladorid || ""}
                      onChange={(event) =>
                        onChange("modeladorid", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                    <datalist id="hist-modeladores">
                      {modeladorIds.map((item) => (
                        <option key={item} value={item} />
                      ))}
                    </datalist>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha requerimiento *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fecharequerimiento)}
                      onChange={(event) =>
                        onChange("fecharequerimiento", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha diseño *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fechadiseno)}
                      onChange={(event) =>
                        onChange("fechadiseno", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha moldería *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fechamolderia)}
                      onChange={(event) =>
                        onChange("fechamolderia", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Fecha registro *</span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fecharegistro)}
                      onChange={(event) =>
                        onChange("fecharegistro", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="col-span-2 flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Tiempos</span>
                    <input
                      type="text"
                      placeholder="Ej: 5 días"
                      value={form.tiempos || ""}
                      onChange={(event) =>
                        onChange("tiempos", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#1B3D8F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
              >
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
