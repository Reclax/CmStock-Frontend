import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCrud } from "../hooks/useCrud";
import {
  FiChevronsLeft,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsRight,
  FiChevronDown,
  FiPlus,
  FiSearch,
  FiAlertTriangle,
} from "react-icons/fi";
import { buildPagination } from "../utils/pagination";

const PAGE_SIZE = 15;

const USER_ROLES = ["admin", "diseñador", "modelador", "gerente", "usuario"];
const UBICACION_TIPOS = ["bodega", "cajon", "estanteria", "caja"];
const MOLDERIA_TIPOS_HORMA = ["formal", "deportiva", "casual"];
const MOLDERIA_TIPOS_TALON = ["bajo", "medio", "alto"];
const MOLDERIA_TIPOS_PUNTA = ["redonda", "cuadrada", "fina"];

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

const TABS = [
  { key: "clientes", label: "Clientes", endpoint: ENDPOINTS.clientes },
  { key: "molderias", label: "Molderias", endpoint: ENDPOINTS.molderias },
  { key: "ubicaciones", label: "Ubicaciones", endpoint: ENDPOINTS.ubicaciones },
  { key: "usuarios", label: "Usuarios", endpoint: ENDPOINTS.usuarios },
];

const baseForms = {
  clientes: { nombre: "", region: "" },
  molderias: {
    nombre: "",
    tipohorma: "",
    talon: "",
    punta: "",
    esnueva: false,
    marca: "",
  },
  ubicaciones: { nombre: "", tipo: "", descripcion: "" },
  usuarios: {
    nombre: "",
    email: "",
    rol: "usuario",
    activo: true,
    password: "",
  },
};

export const AdministracionPage = () => {
  const [tab, setTab] = useState("clientes");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [form, setForm] = useState(baseForms.clientes);

  //  búsqueda + paginación
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const clientes = useCrud(ENDPOINTS.clientes);
  const molderias = useCrud(ENDPOINTS.molderias);
  const ubicaciones = useCrud(ENDPOINTS.ubicaciones);
  const usuarios = useCrud(ENDPOINTS.usuarios);

  const map = { clientes, molderias, ubicaciones, usuarios };
  const current = map[tab];

  useEffect(() => {
    current.load();
  }, [current]);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setSearch("");
    setPage(1);
    setEditing(null);
    setModalOpen(false);
    setRowToDelete(null);
    setForm(baseForms[nextTab]);
  };

  // =========================
  // FILTRO GLOBAL
  // =========================
  const filteredRows = useMemo(() => {
    if (!search) return current.items;

    const q = search.toLowerCase();

    return current.items.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [search, current.items]);

  // =========================
  //  PAGINACIÓN
  // =========================
  const totalItems = filteredRows.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const { safePage, safeTotal, buttons } = buildPagination({
    page,
    totalPages,
    maxButtons: 8,
  });

  const paginatedRowsSafe = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const startIndex = totalItems ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(safePage * PAGE_SIZE, totalItems);

  // =========================
  // CRUD
  // =========================
  const openNew = () => {
    setEditing(null);
    setForm(baseForms[tab]);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    // SOLO usuarios tiene password
    if (tab === "usuarios") {
      setForm({ ...row, password: "" });
    } else {
      setForm({ ...row });
    }

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(baseForms[tab]);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (e) => {
    e.preventDefault();

    const payload = { ...form };

    if (tab === "usuarios" && !payload.password) {
      delete payload.password;
    }

    if (editing) {
      await current.update(editing.id, payload);
    } else {
      await current.create(payload);
    }

    closeModal();
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = (row) => {
    setRowToDelete(row);
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    await current.remove(rowToDelete.id);
    setRowToDelete(null);
  };

  // =========================
  //  COLUMNAS CON ESTILO
  // =========================
  const columnsByTab = {
    clientes: [
      { key: "nombre", label: "Nombre" },
      {
        key: "region",
        label: "Región",
        render: (row) => (
          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
            {row.region || "Sin región"}
          </span>
        ),
      },
    ],

    molderias: [
      { key: "nombre", label: "Nombre" },
      { key: "tipohorma", label: "Tipo horma" },
      { key: "talon", label: "Talón" },
      { key: "punta", label: "Punta" },
      {
        key: "esnueva",
        label: "Estado",
        render: (row) =>
          row.esnueva ? (
            <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
              Nueva
            </span>
          ) : (
            <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
              Usada
            </span>
          ),
      },
      { key: "marca", label: "Marca" },
    ],

    ubicaciones: [
      { key: "nombre", label: "Nombre" },
      {
        key: "tipo",
        label: "Tipo",
        render: (row) => (
          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
            {row.tipo}
          </span>
        ),
      },
      { key: "descripcion", label: "Descripción" },
    ],

    usuarios: [
      { key: "nombre", label: "Nombre" },
      { key: "email", label: "Email" },
      {
        key: "rol",
        label: "Rol",
        render: (row) => (
          <span className="px-2 py-1 text-xs rounded-full bg-slate-100 text-slate-600">
            {row.rol}
          </span>
        ),
      },
      {
        key: "activo",
        label: "Estado",
        render: (row) =>
          row.activo ? (
            <span className="text-emerald-700 font-semibold text-xs">● Activo</span>
          ) : (
            <span className="text-rose-700 font-semibold text-xs">● Inactivo</span>
          ),
      },
    ],
  };

  const tabLabel = TABS.find((t) => t.key === tab)?.label || "";

  // =========================
  // UI
  // =========================
  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Administracion</h1>
          <p>
            CRUDs del sistema (clientes, molderias, ubicaciones y usuarios).
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openNew}>
          <FiPlus /> Nuevo {tabLabel}
        </button>
      </header>

      <div className="tabs-row">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "is-active" : ""}
            onClick={() => switchTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <article className="panel-card">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className={controlWrapClassName}>
            <FiSearch className="text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar en la tabla..."
              className={controlClassName}
              autoComplete="off"
            />
          </div>
        </div>

        <DataGrid
          columns={columnsByTab[tab]}
          rows={paginatedRowsSafe}
          onEdit={openEdit}
          onDelete={handleDelete}
          minWidthClass="min-w-full"
          containerClassName="shadow-none"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
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
              onClick={() =>
                setPage((p) => Math.min(safeTotal || 1, p + 1))
              }
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

      {/* MODAL */}
      {modalOpen && (
        <Modal
          title={editing ? `Editar ${tabLabel}` : `Nuevo ${tabLabel}`}
          onClose={closeModal}
        >
          <form onSubmit={onSave} className="form-grid two-columns">
            {tab === "clientes" && (
              <>
                <div>
                  <label className={labelClassName} htmlFor="adm-cliente-nombre">
                    Nombre
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-cliente-nombre"
                      required
                      value={form.nombre || ""}
                      onChange={(e) => onChange("nombre", e.target.value)}
                      className={controlClassName}
                      placeholder="Ej: Cliente ABC"
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-cliente-region">
                    Region
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-cliente-region"
                      value={form.region || ""}
                      onChange={(e) => onChange("region", e.target.value)}
                      className={controlClassName}
                      placeholder="Ej: Norte"
                      autoComplete="address-level1"
                      list="adm-region-suggestions"
                    />
                    <datalist id="adm-region-suggestions">
                      <option value="Norte" />
                      <option value="Sur" />
                      <option value="Centro" />
                    </datalist>
                  </div>
                </div>
              </>
            )}

            {tab === "molderias" && (
              <>
                <div>
                  <label className={labelClassName} htmlFor="adm-molderia-nombre">
                    Nombre
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-molderia-nombre"
                      required
                      value={form.nombre || ""}
                      onChange={(e) => onChange("nombre", e.target.value)}
                      className={controlClassName}
                      placeholder="Ej: Molderia Central"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-molderia-horma">
                    Horma
                  </label>
                  <div className={`${controlWrapClassName} relative`}>
                    <select
                      id="adm-molderia-horma"
                      required
                      value={form.tipohorma || ""}
                      onChange={(e) => onChange("tipohorma", e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Selecciona</option>
                      {MOLDERIA_TIPOS_HORMA.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-molderia-talon">
                    Talon
                  </label>
                  <div className={`${controlWrapClassName} relative`}>
                    <select
                      id="adm-molderia-talon"
                      required
                      value={form.talon || ""}
                      onChange={(e) => onChange("talon", e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Selecciona</option>
                      {MOLDERIA_TIPOS_TALON.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-molderia-punta">
                    Punta
                  </label>
                  <div className={`${controlWrapClassName} relative`}>
                    <select
                      id="adm-molderia-punta"
                      required
                      value={form.punta || ""}
                      onChange={(e) => onChange("punta", e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Selecciona</option>
                      {MOLDERIA_TIPOS_PUNTA.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div className="inline-check">
                  <input
                    id="adm-molderia-esnueva"
                    type="checkbox"
                    checked={Boolean(form.esnueva)}
                    onChange={(e) => onChange("esnueva", e.target.checked)}
                  />
                  <label htmlFor="adm-molderia-esnueva" className="text-sm font-semibold text-slate-700">
                    Es nueva
                  </label>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-molderia-marca">
                    Marca (opcional)
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-molderia-marca"
                      value={form.marca || ""}
                      onChange={(e) => onChange("marca", e.target.value)}
                      className={controlClassName}
                      placeholder="Ej: Marca X"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "ubicaciones" && (
              <>
                <div>
                  <label className={labelClassName} htmlFor="adm-ubi-nombre">
                    Nombre
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-ubi-nombre"
                      required
                      value={form.nombre || ""}
                      onChange={(e) => onChange("nombre", e.target.value)}
                      className={controlClassName}
                      placeholder="Ej: Bodega principal"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-ubi-tipo">
                    Tipo
                  </label>
                  <div className={`${controlWrapClassName} relative`}>
                    <select
                      id="adm-ubi-tipo"
                      required
                      value={form.tipo || ""}
                      onChange={(e) => onChange("tipo", e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Selecciona</option>
                      {UBICACION_TIPOS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div className="full-width">
                  <label className={labelClassName} htmlFor="adm-ubi-desc">
                    Descripcion (opcional)
                  </label>
                  <div className={controlWrapClassName}>
                    <textarea
                      id="adm-ubi-desc"
                      rows={3}
                      value={form.descripcion || ""}
                      onChange={(e) => onChange("descripcion", e.target.value)}
                      className={controlClassName}
                      placeholder="Notas de ubicacion"
                    />
                  </div>
                </div>
              </>
            )}

            {tab === "usuarios" && (
              <>
                <div>
                  <label className={labelClassName} htmlFor="adm-user-nombre">
                    Nombre
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-user-nombre"
                      required
                      value={form.nombre || ""}
                      onChange={(e) => onChange("nombre", e.target.value)}
                      className={controlClassName}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-user-email">
                    Email
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-user-email"
                      type="email"
                      required
                      value={form.email || ""}
                      onChange={(e) => onChange("email", e.target.value)}
                      className={controlClassName}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClassName} htmlFor="adm-user-rol">
                    Rol
                  </label>
                  <div className={`${controlWrapClassName} relative`}>
                    <select
                      id="adm-user-rol"
                      required
                      value={form.rol || "usuario"}
                      onChange={(e) => onChange("rol", e.target.value)}
                      className={selectClassName}
                    >
                      {USER_ROLES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </div>
                </div>

                <div className="inline-check">
                  <input
                    id="adm-user-activo"
                    type="checkbox"
                    checked={Boolean(form.activo)}
                    onChange={(e) => onChange("activo", e.target.checked)}
                  />
                  <label htmlFor="adm-user-activo" className="text-sm font-semibold text-slate-700">
                    Activo
                  </label>
                </div>

                <div className="full-width">
                  <label className={labelClassName} htmlFor="adm-user-pass">
                    Password {editing ? "(opcional)" : ""}
                  </label>
                  <div className={controlWrapClassName}>
                    <input
                      id="adm-user-pass"
                      type="password"
                      required={!editing}
                      value={form.password || ""}
                      onChange={(e) => onChange("password", e.target.value)}
                      className={controlClassName}
                      autoComplete={editing ? "new-password" : "new-password"}
                      placeholder={editing ? "Dejar vacío para no cambiar" : "Crea una contraseña"}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="form-actions full-width">
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

      {/* CONFIRM DELETE */}
      {rowToDelete && (
        <Modal
          title="Confirmar eliminacion"
          onClose={() => setRowToDelete(null)}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
              <FiAlertTriangle className="mt-0.5" />
              <div>
                <p className="m-0 font-semibold">Esta accion no se puede deshacer.</p>
                <p className="m-0 text-sm">
                  Se eliminara el registro seleccionado de {tabLabel}.
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
    </section>
  );
};