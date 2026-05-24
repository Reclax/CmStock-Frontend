import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiFilter,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiPlus,
  FiSearch,
  FiX,
} from "react-icons/fi";
import Select from "react-select";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import { buildPagination } from "../utils/pagination";

const PAGE_SIZE = 20;

const tabs = [
  { key: "presentaciones", label: "Presentaciones" },
  { key: "producciones", label: "Producciones" },
  { key: "variaciones", label: "Variaciones" },
];

const initialFilters = {
  q: "",
  clienteId: "",
  resultado: "",
  mes: "",
  estado: "",
  dateFrom: "",
  dateTo: "",
};

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const normalizeDateValue = (value) => toDateInput(value);

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1B3D8F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400";

export const HistorialPage = () => {
  const catalogs = useCatalogData();
  const presentaciones = useCrud(ENDPOINTS.presentaciones);
  const producciones = useCrud(ENDPOINTS.producciones);
  const muestras = useCrud(ENDPOINTS.muestras);
  const variaciones = useCrud(ENDPOINTS.variaciones);

  const [tab, setTab] = useState("presentaciones");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [rowToDelete, setRowToDelete] = useState(null);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const { load: loadPresentaciones } = presentaciones;
  const { load: loadProducciones } = producciones;
  const { load: loadMuestras } = muestras;
  const { load: loadVariaciones } = variaciones;

  useEffect(() => {
    loadPresentaciones();
    loadProducciones();
    loadMuestras();
    loadVariaciones();
  }, [loadPresentaciones, loadProducciones, loadMuestras, loadVariaciones]);

  const services = { presentaciones, producciones, variaciones };
  const service = services[tab];
  const canManage = tab !== "variaciones";

  useEffect(() => {
    setPage(1);
    setRowToDelete(null);
  }, [tab]);

  const activeFilters = filters;

  useEffect(() => {
    setPage(1);
  }, [activeFilters, tab]);

  const muestrasMap = useMemo(() => {
    const map = {};
    muestras.items.forEach((item) => {
      map[item.id] = item.referencia;
    });
    variaciones.items.forEach((item) => {
      map[item.id] = item.referencia;
    });
    return map;
  }, [muestras.items, variaciones.items]);

  const estadoOptions = useMemo(() => {
    if (tab !== "variaciones") {
      return [];
    }

    const values = new Set();
    (service.items || []).forEach((row) => {
      if (row.estado) values.add(String(row.estado).trim());
    });

    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));
  }, [service.items, tab]);

  const allMuestrasOptions = useMemo(() => {
    const opts = [];
    muestras.items.forEach((item) => {
      opts.push({ value: item.id, label: item.referencia });
    });
    variaciones.items.forEach((item) => {
      opts.push({ value: item.id, label: `${item.referencia} (Var)` });
    });
    return opts;
  }, [muestras.items, variaciones.items]);

  const getMuestraLabel = (row) =>
    row.muestra?.referencia ||
    row.variacion?.referencia ||
    muestrasMap[row.muestraid] ||
    row.muestraid;

  const getVariacionOriginalLabel = (row) =>
    row.muestraOriginal?.referencia ||
    muestrasMap[row.muestraOriginalId] ||
    row.muestraOriginalId;

  const filteredRows = useMemo(() => {
    const rows = service.items || [];
    const query = normalizeText(activeFilters.q);
    const from = activeFilters.dateFrom;
    const to = activeFilters.dateTo;

    return rows.filter((row) => {
      const rowClienteId = String(row.clienteid ?? "");
      const rowDate = normalizeDateValue(
        tab === "presentaciones"
          ? row.fecha
          : tab === "producciones"
            ? row.fechaproduccion
            : row.fechaelaboracion || row.createdAt || row.createdat,
      );

      if (activeFilters.clienteId && rowClienteId !== activeFilters.clienteId) {
        return false;
      }

      if (from && rowDate && rowDate < from) {
        return false;
      }

      if (to && rowDate && rowDate > to) {
        return false;
      }

      if (tab === "presentaciones") {
        if (
          activeFilters.resultado &&
          normalizeText(row.resultado) !== normalizeText(activeFilters.resultado)
        ) {
          return false;
        }

        if (query) {
          const haystack = [
            getMuestraLabel(row),
            catalogs.clientesMap?.[row.clienteid] ?? row.clienteid,
            row.resultado,
            row.observaciones,
          ]
            .map(normalizeText)
            .join(" ");

          if (!haystack.includes(query)) {
            return false;
          }
        }
      } else if (tab === "producciones") {
        if (activeFilters.mes && normalizeText(row.mes) !== normalizeText(activeFilters.mes)) {
          return false;
        }

        if (query) {
          const haystack = [
            row.ordennumero,
            getMuestraLabel(row),
            catalogs.clientesMap?.[row.clienteid] ?? row.clienteid,
            row.mes,
          ]
            .map(normalizeText)
            .join(" ");

          if (!haystack.includes(query)) {
            return false;
          }
        }
      } else {
        if (activeFilters.estado && normalizeText(row.estado) !== normalizeText(activeFilters.estado)) {
          return false;
        }

        if (query) {
          const haystack = [
            row.referencia,
            row.orden,
            getVariacionOriginalLabel(row),
            catalogs.clientesMap?.[row.clienteid] ?? row.clienteid,
            row.segmento,
            row.estado,
            row.observaciones,
          ]
            .map(normalizeText)
            .join(" ");

          if (!haystack.includes(query)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [activeFilters, catalogs.clientesMap, getMuestraLabel, service.items, tab]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

  useEffect(() => {
    if (!totalPages) {
      setPage(1);
      return;
    }
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalItems = filteredRows.length;
  const startIndex = totalItems ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(page * PAGE_SIZE, totalItems);

  const { safePage, safeTotal, buttons } = buildPagination({
    page,
    totalPages,
    maxButtons: 8,
  });

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;
  const totalLabel =
    tab === "presentaciones"
      ? "presentaciones"
      : tab === "producciones"
        ? "producciones"
        : "variaciones";

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const clienteOptions = useMemo(
    () => catalogs.clientes.map((item) => ({ value: item.id, label: item.nombre })),
    [catalogs.clientes],
  );

  const resultadoOptions = [
    { value: "aprobada", label: "Aprobada" },
    { value: "pendiente", label: "Pendiente" },
    { value: "dada de baja", label: "Dado de baja" },
    {value: "presentada",label:"Presentada"},
  ];

  const mesOptions = useMemo(() => {
    const values = new Set();
    (service.items || []).forEach((row) => {
      if (row.mes) values.add(String(row.mes).trim());
    });
    return Array.from(values)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({ value, label: value }));
  }, [service.items]);

  const openForm = (row = null) => {
    if (!canManage) {
      return;
    }
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
      const produccionValue = toNumber(payload.paresaprobados);
      payload = {
        ...payload,
        paresaprobados: produccionValue,
        derivoproduccion: produccionValue > 0,
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
    return [];
  }, []);

  const modeladorIds = useMemo(() => {
    return [];
  }, []);

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
      { key: "paresaprobados", label: "Produccion" },
      {
        key: "derivoproduccion",
        label: "Derivo",
        render: (row) => (row.paresaprobados > 0 ? "Si" : "No"),
      },
    ],
    producciones: [
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
    variaciones: [
      { key: "referencia", label: "Referencia" },
      {
        key: "muestraOriginalId",
        label: "Original",
        render: getVariacionOriginalLabel,
      },
      {
        key: "clienteid",
        label: "Cliente",
        render: (row) => catalogs.clientesMap[row.clienteid] || row.clienteid,
      },
      { key: "segmento", label: "Segmento" },
      { key: "estado", label: "Estado" },
      {
        key: "fechaelaboracion",
        label: "Fecha",
        render: (row) => toDateInput(row.fechaelaboracion),
      },
    ],
  };

  const filterTitle =
    tab === "presentaciones"
      ? "Filtrar presentaciones"
      : tab === "producciones"
        ? "Filtrar producciones"
        : "Filtrar variaciones";

  const filterPlaceholder =
    tab === "presentaciones"
      ? "Buscar por referencia, cliente u observación..."
      : tab === "producciones"
        ? "Buscar por orden, referencia o cliente..."
        : "Buscar por referencia, original o cliente...";

  return (
    <section className="space-y-5">
      <header className="px-1 py-4 border-b border-slate-200">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-[clamp(1.6rem,2.2vw,2rem)] font-extrabold text-[#1B3D8F] tracking-[-0.02em]">
            Historial
          </h1>
          <p className="text-sm text-slate-500 max-w-lg">
            Control de presentaciones y producción.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#1B3D8F] focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400"
            placeholder={filterPlaceholder}
            value={activeFilters.q}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, q: event.target.value }))
            }
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((value) => !value)}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${showFilters || activeFilterCount > 0
            ? "border-[#1B3D8F] bg-[#1B3D8F] text-white shadow-[0_4px_14px_rgba(27,61,143,0.25)]"
            : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300"
            }`}
        >
          <FiFilter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#1B3D8F]">
              {activeFilterCount}
            </span>
          )}
        </button>
          {canManage && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#163272] active:scale-[0.98]"
              onClick={() => openForm()}
            >
              <FiPlus className="h-4 w-4" /> Nuevo registro
            </button>
          )}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
          >
            <FiX className="h-4 w-4" />
            Limpiar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {filterTitle}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select
              className={inputCls}
              value={activeFilters.clienteId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, clienteId: event.target.value }))
              }
            >
              <option value="">Todos los clientes</option>
              {clienteOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {tab === "presentaciones" ? (
              <select
                className={inputCls}
                value={activeFilters.resultado}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, resultado: event.target.value }))
                }
              >
                <option value="">Todos los resultados</option>
                {resultadoOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : tab === "producciones" ? (
              <select
                className={inputCls}
                value={activeFilters.mes}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, mes: event.target.value }))
                }
              >
                <option value="">Todos los meses</option>
                {mesOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className={inputCls}
                value={activeFilters.estado}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, estado: event.target.value }))
                }
              >
                <option value="">Todos los estados</option>
                {estadoOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            )}

            <input
              type="date"
              className={inputCls}
              value={activeFilters.dateFrom}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
              }
            />

            <input
              type="date"
              className={inputCls}
              value={activeFilters.dateTo}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
              }
            />
          </div>
        </div>
      )}

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="text-sm font-medium text-slate-600">
            {startIndex}-{endIndex} de {totalItems} {totalLabel}
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="font-medium text-slate-500">Total</span>
            <strong className="text-[#1B3D8F]">{totalItems}</strong>
          </div>
        </div>

        <div className="p-5">
          <DataGrid
            columns={columnsByTab[tab]}
            rows={paginatedRows}
            onEdit={canManage ? openForm : undefined}
            onDelete={canManage ? (row) => setRowToDelete(row) : undefined}
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
            Página {safePage} de {safeTotal}
          </span>
        </div>
      </article>

      {canManage && rowToDelete && (
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
                  Se eliminara el registro seleccionado.
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
                onClick={confirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {canManage && modalOpen && (
        <Modal
          title={editing ? "Editar registro" : "Nuevo registro"}
          onClose={closeForm}
        >
          <form onSubmit={onSubmit} className="space-y-6">
            {tab === "presentaciones" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">
                      Muestra *
                    </span>
                    <Select
                      options={allMuestrasOptions}
                      value={
                        form.muestraid
                          ? allMuestrasOptions.find((o) => o.value === form.muestraid) || {
                              value: form.muestraid,
                              label: form.muestraid,
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
                    <span className="text-sm font-semibold text-slate-700">
                      Cliente *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha *
                    </span>
                    <input
                      type="date"
                      required
                      value={toDateInput(form.fecha)}
                      onChange={(event) =>
                        onChange("fecha", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">
                      Resultado *
                    </span>
                    <select
                      required
                      value={form.resultado || ""}
                      onChange={(event) =>
                        onChange("resultado", event.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-[#1B3D8F] focus:outline-none focus:ring-1 focus:ring-[#1B3D8F]"
                    >
                      <option value="">Selecciona</option>
                      <option value="aprobada">Aprobado</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="rechazada">Dado de baja</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">
                      Produccion
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.paresaprobados || ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        onChange("paresaprobados", value);
                        const numValue = toNumber(value);
                        if (numValue > 0) {
                          onChange("derivoproduccion", true);
                        }
                      }}
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
                  <span className="text-sm font-medium text-slate-700">
                    Derivó en producción
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">
                    Observaciones
                  </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Muestra *
                    </span>
                    <Select
                      options={allMuestrasOptions}
                      value={
                        form.muestraid
                          ? allMuestrasOptions.find((o) => o.value === form.muestraid) || {
                              value: form.muestraid,
                              label: form.muestraid,
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
                    <span className="text-sm font-semibold text-slate-700">
                      Cliente *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Orden producción *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Pares producidos *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha producción *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Mes *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Muestra *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Diseñador ID *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Modelador ID *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha requerimiento *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha diseño *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha moldería *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Fecha registro *
                    </span>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Tiempos
                    </span>
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
