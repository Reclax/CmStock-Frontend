import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCrud } from "../hooks/useCrud";
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiSearch,
  FiAlertTriangle,
} from "react-icons/fi";

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

export const CatalogosPage = () => {
  const [tab, setTab] = useState("clientes");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [form, setForm] = useState(baseForms.clientes);

  //  búsqueda + paginación
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const clientes = useCrud(ENDPOINTS.clientes);
  const molderias = useCrud(ENDPOINTS.molderias);
  const ubicaciones = useCrud(ENDPOINTS.ubicaciones);
  const usuarios = useCrud(ENDPOINTS.usuarios);

  const map = { clientes, molderias, ubicaciones, usuarios };
  const current = map[tab];

  useEffect(() => {
    current.load();
  }, [tab]);

  // =========================
  // FILTRO GLOBAL
  // =========================
  const filteredRows = useMemo(() => {
    if (!search) return current.items;

    const q = search.toLowerCase();

    return current.items.filter((row) =>
      Object.values(row).some((val) =>
        String(val).toLowerCase().includes(q)
      )
    );
  }, [search, current.items]);

  // =========================
  //  PAGINACIÓN
  // =========================
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);

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

    setModalOpen(false);
    setEditing(null);
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = (row) => {
    setRowToDelete(row);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    await current.remove(rowToDelete.id);
    setConfirmOpen(false);
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
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
            {row.region}
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
            <span className="text-green-600 text-xs font-semibold">
              Nueva
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Usada</span>
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
          <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
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
          <span className="px-2 py-1 text-xs rounded bg-indigo-100 text-indigo-700">
            {row.rol}
          </span>
        ),
      },
      {
        key: "activo",
        label: "Estado",
        render: (row) =>
          row.activo ? (
            <span className="text-green-600 font-semibold text-xs">
              ● Activo
            </span>
          ) : (
            <span className="text-rose-600 font-semibold text-xs">
              ● Inactivo
            </span>
          ),
      },
    ],
  };

  // =========================
  // UI
  // =========================
  return (
    <section className="space-y-6 text-[15px]">
      {/* HEADER */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Administración</h1>
          <p className="text-slate-500">
            Gestión de datos maestros del sistema
          </p>
        </div>

        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[#1B3D8F] text-white px-4 py-2 rounded-xl"
        >
          <FiPlus />
          Nuevo
        </button>
      </header>

      {/* TABS */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl ${
              tab === t.key
                ? "bg-[#1B3D8F] text-white"
                : "bg-white border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* BUSCADOR */}
      <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2">
        <FiSearch />
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full outline-none"
        />
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow p-4">
        <DataGrid
          columns={columnsByTab[tab]}
          rows={paginatedRows}
          onEdit={openEdit}
          onDelete={handleDelete}
        />

        {/* PAGINACIÓN */}
        <div className="flex justify-between items-center mt-4 text-sm">
          <span>
            Página {page} de {totalPages || 1}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 border rounded"
            >
              ←
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 border rounded"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <Modal
          title={editing ? "Editar" : "Nuevo"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={onSave} className="space-y-4">
            {Object.keys(baseForms[tab]).map((field) => {
              if (field === "password" && tab !== "usuarios") return null;

              return (
                <input
                  key={field}
                  type={field === "password" ? "password" : "text"}
                  placeholder={field}
                  value={form[field] || ""}
                  onChange={(e) => onChange(field, e.target.value)}
                  className="w-full border rounded-xl p-3"
                />
              );
            })}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="bg-[#1B3D8F] text-white px-4 py-2 rounded-xl">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRM DELETE */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-2xl text-center">
            <FiAlertTriangle className="text-rose-500 text-3xl mx-auto mb-3" />
            <p>¿Eliminar registro?</p>

            <div className="flex justify-center gap-3 mt-4">
              <button onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="bg-rose-600 text-white px-4 py-2 rounded-xl"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};