import Select from "react-select";
import { FiFilter, FiPlus, FiSearch, FiX } from "react-icons/fi";
import { inputCls, selectStyles } from "./MuestrasUI";
import { ESTADO_META } from "./MuestrasUtils";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const MuestrasFilters = ({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  activeFilterCount,
  clearFilters,
  openCreate,
  catalogs,
  segmentoSelectOptions,
  dimaSelectOptions,
  procesoSelectOptions,
  molderiaInputValue,
  setMolderiaInputValue,
  handleMesChange,
}) => {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#1B3D8F] focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400"
            placeholder="Buscar por referencia o modelo..."
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
            showFilters || activeFilterCount > 0
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
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B3D8F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#163272] shadow-sm active:scale-[0.98]"
        >
          <FiPlus className="h-4 w-4" />
          Nueva muestra
        </button>
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

      {/* ── FILTROS AVANZADOS ── */}
      {showFilters && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Filtros avanzados
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              options={segmentoSelectOptions}
              isClearable
              placeholder="Buscar segmento..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              value={
                filters.segmento
                  ? { value: filters.segmento, label: filters.segmento }
                  : null
              }
              onChange={(opt) =>
                setFilters((p) => ({ ...p, segmento: opt ? opt.value : "" }))
              }
            />
            <select
              className={inputCls}
              value={filters.estado}
              onChange={(e) =>
                setFilters((p) => ({ ...p, estado: e.target.value }))
              }
            >
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_META).map(([val, { label }]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.clienteid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, clienteid: e.target.value }))
              }
            >
              <option value="">Todos los clientes</option>
              {catalogs.clientes.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            <Select
              options={catalogs.molderias.map((i) => ({
                value: i.nombre,
                label: i.nombre,
              }))}
              isClearable
              placeholder="Buscar moldería..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              inputValue={molderiaInputValue}
              value={
                filters.molderia && !molderiaInputValue
                  ? { value: filters.molderia, label: filters.molderia }
                  : null
              }
              onInputChange={(val, { action }) => {
                if (action === "input-change") {
                  setMolderiaInputValue(val);
                  setFilters((p) => ({ ...p, molderia: val, molderiaid: "" }));
                }
              }}
              onChange={(opt) => {
                if (opt) {
                  setMolderiaInputValue("");
                  setFilters((p) => ({
                    ...p,
                    molderia: opt.value,
                    molderiaid: "",
                  }));
                } else {
                  setMolderiaInputValue("");
                  setFilters((p) => ({ ...p, molderia: "", molderiaid: "" }));
                }
              }}
            />
            <select
              className={inputCls}
              value={filters.ubicacionid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, ubicacionid: e.target.value }))
              }
            >
              <option value="">Todas las ubicaciones</option>
              {catalogs.ubicaciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.disenadorid}
              onChange={(e) =>
                setFilters((p) => ({ ...p, disenadorid: e.target.value }))
              }
            >
              <option value="">Todos los diseñadores</option>
              {catalogs.disenadores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.licenciado}
              onChange={(e) =>
                setFilters((p) => ({ ...p, licenciado: e.target.value }))
              }
            >
              <option value="">Licencia (todas)</option>
              <option value="true">Licenciado</option>
              <option value="false">Genérico</option>
            </select>
            <Select
              options={dimaSelectOptions}
              isClearable
              placeholder="Buscar DIMA..."
              styles={selectStyles}
              menuPortalTarget={document.body}
              value={
                filters.dima
                  ? { value: filters.dima, label: filters.dima }
                  : null
              }
              onChange={(opt) =>
                setFilters((p) => ({ ...p, dima: opt ? opt.value : "" }))
              }
            />
            <select
              className={inputCls}
              value={filters.mes}
              onChange={(e) => handleMesChange(e.target.value)}
            >
              <option value="">Todos los meses</option>
              {MESES.map((nombre, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {nombre}
                </option>
              ))}
            </select>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Rango de fechas
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className={inputCls}
                  value={filters.from}
                  placeholder="Desde"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, from: e.target.value, mes: "" }))
                  }
                />
                <input
                  type="date"
                  className={inputCls}
                  value={filters.to}
                  placeholder="Hasta"
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, to: e.target.value, mes: "" }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
