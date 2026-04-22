import { useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCrud } from "../hooks/useCrud";

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
  const [form, setForm] = useState(baseForms.clientes);

  const clientes = useCrud(ENDPOINTS.clientes);
  const molderias = useCrud(ENDPOINTS.molderias);
  const ubicaciones = useCrud(ENDPOINTS.ubicaciones);
  const usuarios = useCrud(ENDPOINTS.usuarios);

  const map = { clientes, molderias, ubicaciones, usuarios };
  const current = map[tab];

  const loadCurrent = async () => {
    await current.load();
  };

  if (!current.items.length && !current.loading) {
    loadCurrent();
  }

  const openNew = () => {
    setEditing(null);
    setForm(baseForms[tab]);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...row, password: "" });
    setModalOpen(true);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (event) => {
    event.preventDefault();

    const payload = { ...form };
    if (tab === "usuarios" && !payload.password) {
      delete payload.password;
    }

    if (editing) {
      await current.update(editing.id, payload);
    } else {
      await current.create(payload);
    }

    setEditing(null);
    setForm(baseForms[tab]);
    setModalOpen(false);
  };

  const columnsByTab = {
    clientes: [
      { key: "nombre", label: "Nombre" },
      { key: "region", label: "Region" },
    ],
    molderias: [
      { key: "nombre", label: "Nombre" },
      { key: "tipohorma", label: "Tipo horma" },
      { key: "talon", label: "Talon" },
      { key: "punta", label: "Punta" },
      {
        key: "esnueva",
        label: "Nueva",
        render: (row) => (row.esnueva ? "Si" : "No"),
      },
      { key: "marca", label: "Marca" },
    ],
    ubicaciones: [
      { key: "nombre", label: "Nombre" },
      { key: "tipo", label: "Tipo" },
      { key: "descripcion", label: "Descripcion" },
    ],
    usuarios: [
      { key: "nombre", label: "Nombre" },
      { key: "email", label: "Email" },
      { key: "rol", label: "Rol" },
      {
        key: "activo",
        label: "Activo",
        render: (row) => (row.activo ? "Si" : "No"),
      },
    ],
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Catalogos maestros</h1>
          <p>
            Administra datos base para flujos de muestra, inventario y
            seguridad.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openNew}>
          Nuevo registro
        </button>
      </header>

      <div className="tabs-row">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? "tab-btn tab-btn-active" : "tab-btn"}
            onClick={() => {
              setTab(item.key);
              setEditing(null);
              setForm(baseForms[item.key]);
              setModalOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <DataGrid
        columns={columnsByTab[tab]}
        rows={current.items}
        onEdit={openEdit}
        onDelete={(row) => current.remove(row.id)}
      />

      {modalOpen && (
        <Modal
          title={editing ? "Editar registro" : "Nuevo registro"}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
        >
          <form className="form-grid" onSubmit={onSave}>
            {tab === "clientes" && (
              <>
                <label>
                  Nombre
                  <input
                    value={form.nombre || ""}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Region
                  <input
                    value={form.region || ""}
                    onChange={(event) => onChange("region", event.target.value)}
                  />
                </label>
              </>
            )}

            {tab === "molderias" && (
              <>
                <label>
                  Nombre
                  <input
                    value={form.nombre || ""}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Tipo horma
                  <input
                    value={form.tipohorma || ""}
                    onChange={(event) =>
                      onChange("tipohorma", event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Talon
                  <input
                    value={form.talon || ""}
                    onChange={(event) => onChange("talon", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Punta
                  <input
                    value={form.punta || ""}
                    onChange={(event) => onChange("punta", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Marca
                  <input
                    value={form.marca || ""}
                    onChange={(event) => onChange("marca", event.target.value)}
                  />
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.esnueva)}
                    onChange={(event) =>
                      onChange("esnueva", event.target.checked)
                    }
                  />
                  Molderia nueva
                </label>
              </>
            )}

            {tab === "ubicaciones" && (
              <>
                <label>
                  Nombre
                  <input
                    value={form.nombre || ""}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Tipo
                  <input
                    value={form.tipo || ""}
                    onChange={(event) => onChange("tipo", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Descripcion
                  <input
                    value={form.descripcion || ""}
                    onChange={(event) =>
                      onChange("descripcion", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            {tab === "usuarios" && (
              <>
                <label>
                  Nombre
                  <input
                    value={form.nombre || ""}
                    onChange={(event) => onChange("nombre", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={form.email || ""}
                    onChange={(event) => onChange("email", event.target.value)}
                    required
                  />
                </label>
                <label>
                  Rol
                  <select
                    value={form.rol || "usuario"}
                    onChange={(event) => onChange("rol", event.target.value)}
                  >
                    <option value="admin">admin</option>
                    <option value="diseñador">diseñador</option>
                    <option value="modelador">modelador</option>
                    <option value="usuario">usuario</option>
                    <option value="gerente">gerente</option>
                  </select>
                </label>
                <label>
                  Contrasena
                  <input
                    type="password"
                    value={form.password || ""}
                    onChange={(event) =>
                      onChange("password", event.target.value)
                    }
                    placeholder={
                      editing ? "Dejar vacio para mantener" : "Obligatoria"
                    }
                  />
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.activo)}
                    onChange={(event) =>
                      onChange("activo", event.target.checked)
                    }
                  />
                  Activo
                </label>
              </>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setModalOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="primary-btn">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
