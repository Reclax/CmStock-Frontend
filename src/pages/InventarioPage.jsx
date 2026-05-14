import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlus,
  FiSearch,
} from "react-icons/fi";
import Select from "react-select";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import { buildPagination } from "../utils/pagination";

const PAGE_SIZE = 15;

const labelClassName =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500";
const controlWrapClassName =
  "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-200 focus-within:border-[#1B3D8F] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(27,61,143,0.10)]";
const controlClassName =
  "w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400";
const selectClassName =
  "w-full appearance-none border-0 bg-transparent pr-8 text-sm outline-none focus:outline-none focus:ring-0";

const SelectChevron = () => (
  <FiChevronDown
    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
    aria-hidden="true"
  />
);

const emptyForm = {
  muestraid: "",
  tipo: "entrada",
  cantidad: 1,
  fecha: "",
  motivo: "",
  usuarioid: "",
};

// =========================
// BADGES
// =========================
const TipoBadge = ({ tipo }) => {
  return tipo === "entrada" ? (
    <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
      <FiArrowUp /> Entrada
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-rose-100 text-rose-700 flex items-center gap-1">
      <FiArrowDown /> Salida
    </span>
  );
};

const StockBadge = ({ value }) => {
  let color = "bg-emerald-100 text-emerald-700";
  if (value <= 2) color = "bg-rose-100 text-rose-700";
  else if (value <= 5) color = "bg-amber-100 text-amber-700";

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${color}`}>{value}</span>
  );
};

const UbicacionBadge = ({ value }) => (
  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
    {value}
  </span>
);

// =========================
// HELPERS
// =========================
const useSearchAndPagination = (data) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return data;

    return data.filter((row) =>
      Object.values(row).join(" ").toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(Math.max(page, 1), totalPages || 1);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  return {
    search,
    setSearch,
    page: safePage,
    setPage,
    totalPages,
    filteredCount: filtered.length,
    rows: paginated,
  };
};

// =========================
// PAGE
// =========================
export const InventarioPage = () => {
  const catalogs = useCatalogData();
  const movimientos = useCrud(ENDPOINTS.movimientosInventario);
  const muestras = useCrud(ENDPOINTS.muestras);

  const [tab, setTab] = useState("stock");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { load: loadMovimientos } = movimientos;
  const { load: loadMuestras } = muestras;

  useEffect(() => {
    loadMovimientos();
    loadMuestras();
  }, [loadMovimientos, loadMuestras]);

  // =========================
  // DATA
  // =========================
  const stockByMuestra = useMemo(() => {
    const map = {};

    for (const item of movimientos.items) {
      const qty = toNumber(item.cantidad) || 0;
      const delta = item.tipo === "salida" ? -qty : qty;
      map[item.muestraid] = (map[item.muestraid] || 0) + delta;
    }

    return muestras.items.map((m) => ({
      id: m.id,
      referencia: m.referencia,
      modelo: m.modelo,
      ubicacion: catalogs.ubicacionesMap[m.ubicacionid] || m.ubicacionid,
      stock: Math.max(0, (m.pareselaborados || 0) + (map[m.id] || 0)),
    }));
  }, [movimientos.items, muestras.items, catalogs.ubicacionesMap]);

  const muestraLabelById = useMemo(() => {
    return Object.fromEntries(
      muestras.items.map((m) => [
        m.id,
        `${m.referencia}${m.modelo ? ` · ${m.modelo}` : ""}`,
      ]),
    );
  }, [muestras.items]);

  const stockByUbicacion = useMemo(() => {
    const map = {};
    for (const item of stockByMuestra) {
      map[item.ubicacion] = (map[item.ubicacion] || 0) + item.stock;
    }
    return Object.entries(map).map(([ubicacion, stock]) => ({
      id: ubicacion,
      ubicacion,
      stock,
    }));
  }, [stockByMuestra]);

  // =========================
  // SEARCH + PAGINATION
  // =========================
  const stockState = useSearchAndPagination(stockByMuestra);
  const historialState = useSearchAndPagination(movimientos.items);
  const ubicacionState = useSearchAndPagination(stockByUbicacion);

  // =========================
  // CRUD
  // =========================
  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      fecha: toDateInput(new Date()),
      usuarioid: catalogs.usuarios?.[0]?.id || "",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...row,
      cantidad: toNumber(row.cantidad),
      fecha: toDateInput(row.fecha),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.muestraid) {
      // keep simple client-side validation similar to native required
      alert("Selecciona una muestra");
      return;
    }

    const payload = {
      ...form,
      cantidad: toNumber(form.cantidad),
    };

    if (editing) {
      await movimientos.update(editing.id, payload);
    } else {
      await movimientos.create(payload);
    }

    closeModal();
  };

  const deleteRow = async () => {
    await movimientos.remove(rowToDelete.id);
    setRowToDelete(null);
  };

  // =========================
  // UI
  // =========================
  const renderTable = (state, columns, gridProps = {}) => {
    const total = state.filteredCount || 0;
    const startIndex = total ? (state.page - 1) * PAGE_SIZE + 1 : 0;
    const endIndex = Math.min(state.page * PAGE_SIZE, total);

    const { safePage, safeTotal, buttons } = buildPagination({
      page: state.page,
      totalPages: state.totalPages,
      maxButtons: 8,
    });

    return (
      <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <div className={controlWrapClassName}>
            <FiSearch className="text-slate-500" />
            <input
              placeholder="Buscar..."
              value={state.search}
              onChange={(e) => {
                state.setSearch(e.target.value);
                state.setPage(1);
              }}
              className={controlClassName}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="p-5">
          <DataGrid
            columns={columns}
            rows={state.rows}
            minWidthClass="min-w-full"
            containerClassName="shadow-none"
            {...gridProps}
          />
        </div>

        <div className="border-t border-slate-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Page</span>

            <button
              type="button"
              className="ghost-btn"
              disabled={safePage <= 1}
              onClick={() => state.setPage(1)}
              title="Primera"
            >
              <FiChevronsLeft />
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage <= 1}
              onClick={() => state.setPage((p) => Math.max(1, p - 1))}
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
                    onClick={() => state.setPage(item)}
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
              onClick={() =>
                state.setPage((p) => Math.min(safeTotal || 1, p + 1))
              }
              title="Siguiente"
            >
              <FiChevronRight />
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={safePage >= safeTotal}
              onClick={() => state.setPage(safeTotal)}
              title="Ultima"
            >
              <FiChevronsRight />
            </button>
          </div>

          <span className="text-slate-500">
            Results {startIndex} to {endIndex} of {total}
          </span>
        </div>
      </article>
    );
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const historialColumns = [
    {
      key: "muestraid",
      label: "Muestra",
      render: (row) => muestraLabelById[row.muestraid] || row.muestraid,
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (row) => <TipoBadge tipo={row.tipo} />,
    },
    { key: "cantidad", label: "Cantidad" },
    {
      key: "fecha",
      label: "Fecha",
      render: (row) => toDateInput(row.fecha),
    },
    { key: "motivo", label: "Motivo" },
    {
      key: "usuarioid",
      label: "Usuario",
      render: (row) => catalogs.usuariosMap?.[row.usuarioid] || row.usuarioid,
    },
  ];

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Inventario y bodega
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Stock por muestra, ubicación e historial de movimientos.
          </p>
        </div>
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
            onClick={openCreate}
          >
            <FiPlus className="h-4 w-4" /> Nuevo movimiento
          </button>
        </div>
      </header>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setTab("stock")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "stock"
              ? "bg-white text-[#1B3D8F] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Stock
        </button>
        <button
          type="button"
          onClick={() => setTab("historial")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "historial"
              ? "bg-white text-[#1B3D8F] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Historial
        </button>
        <button
          type="button"
          onClick={() => setTab("ubicacion")}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
            tab === "ubicacion"
              ? "bg-white text-[#1B3D8F] shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Por ubicación
        </button>
      </div>

      {tab === "stock" &&
        renderTable(stockState, [
          { key: "referencia", label: "Referencia" },
          {
            key: "ubicacion",
            label: "Ubicacion",
            render: (row) => <UbicacionBadge value={row.ubicacion} />,
          },
          {
            key: "stock",
            label: "Stock",
            render: (row) => <StockBadge value={row.stock} />,
          },
        ])}

      {tab === "historial" &&
        renderTable(historialState, historialColumns, {
          onEdit: openEdit,
          onDelete: (row) => setRowToDelete(row),
        })}

      {tab === "ubicacion" &&
        renderTable(ubicacionState, [
          {
            key: "ubicacion",
            label: "Ubicacion",
            render: (row) => <UbicacionBadge value={row.ubicacion} />,
          },
          {
            key: "stock",
            label: "Stock",
            render: (row) => <StockBadge value={row.stock} />,
          },
        ])}

      {modalOpen && (
        <Modal
          title={editing ? "Editar movimiento" : "Nuevo movimiento"}
          onClose={closeModal}
        >
          <form
            onSubmit={submit}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="full-width sm:col-span-2">
              <label className={labelClassName} htmlFor="inv-muestra">
                Muestra
              </label>
              <Select
                options={muestras.items.map((m) => ({
                  value: m.id,
                  label: `${m.referencia}${m.modelo ? ` · ${m.modelo}` : ""}`,
                }))}
                value={
                  form.muestraid
                    ? {
                        value: form.muestraid,
                        label:
                          muestraLabelById[form.muestraid] || form.muestraid,
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
                  menuList: (base) => ({ ...base, maxHeight: "200px" }),
                }}
              />
            </div>

            <div>
              <label className={labelClassName} htmlFor="inv-tipo">
                Tipo
              </label>
              <div className={`${controlWrapClassName} relative`}>
                <select
                  id="inv-tipo"
                  value={form.tipo}
                  onChange={(e) => onChange("tipo", e.target.value)}
                  className={selectClassName}
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
                <SelectChevron />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="inv-cantidad">
                Cantidad
              </label>
              <div className={controlWrapClassName}>
                <input
                  id="inv-cantidad"
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={form.cantidad}
                  onChange={(e) => onChange("cantidad", e.target.value)}
                  className={controlClassName}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className={labelClassName} htmlFor="inv-fecha">
                Fecha
              </label>
              <div className={controlWrapClassName}>
                <input
                  id="inv-fecha"
                  type="date"
                  required
                  value={form.fecha || ""}
                  onChange={(e) => onChange("fecha", e.target.value)}
                  className={controlClassName}
                />
              </div>
            </div>

            <div className="full-width sm:col-span-2">
              <label className={labelClassName} htmlFor="inv-motivo">
                Motivo (opcional)
              </label>
              <div className={controlWrapClassName}>
                <textarea
                  id="inv-motivo"
                  rows={3}
                  value={form.motivo || ""}
                  onChange={(e) => onChange("motivo", e.target.value)}
                  className={controlClassName}
                  placeholder="Ej: Ajuste de inventario / traslado / entrega..."
                />
              </div>
            </div>

            <div className="full-width sm:col-span-2">
              <label className={labelClassName} htmlFor="inv-usuario">
                Usuario
              </label>
              <div className={`${controlWrapClassName} relative`}>
                <select
                  id="inv-usuario"
                  required
                  value={form.usuarioid || ""}
                  onChange={(e) => onChange("usuarioid", e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Selecciona un usuario</option>
                  {catalogs.usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.rol})
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
            </div>

            <div className="form-actions full-width sm:col-span-2">
              <button type="button" className="ghost-btn" onClick={closeModal}>
                Cancelar
              </button>
              <button type="submit" className="primary-btn">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {rowToDelete && (
        <Modal
          title="Confirmar eliminacion"
          onClose={() => setRowToDelete(null)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <FiAlertTriangle className="mt-0.5" />
              <div>
                <p className="m-0 font-semibold">
                  Esta accion no se puede deshacer.
                </p>
                <p className="m-0 text-sm">
                  Se eliminara el movimiento seleccionado.
                </p>
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
              <button
                type="button"
                className="secondary-btn"
                onClick={deleteRow}
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
