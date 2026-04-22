import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";

const emptyForm = {
  muestraid: "",
  tipo: "entrada",
  cantidad: 1,
  fecha: "",
  motivo: "",
  usuarioid: "",
};

export const InventarioPage = () => {
  const catalogs = useCatalogData();
  const movimientos = useCrud(ENDPOINTS.movimientosInventario);
  const muestras = useCrud(ENDPOINTS.muestras);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { load: loadMovimientos } = movimientos;
  const { load: loadMuestras } = muestras;

  useEffect(() => {
    loadMovimientos();
    loadMuestras();
  }, [loadMovimientos, loadMuestras]);

  const stockByMuestra = useMemo(() => {
    const map = {};
    for (const item of movimientos.items) {
      const qty = toNumber(item.cantidad) || 0;
      const delta = item.tipo === "salida" ? -qty : qty;
      map[item.muestraid] = (map[item.muestraid] || 0) + delta;
    }

    return muestras.items.map((muestra) => ({
      id: muestra.id,
      referencia: muestra.referencia,
      modelo: muestra.modelo,
      ubicacion:
        catalogs.ubicacionesMap[muestra.ubicacionid] || muestra.ubicacionid,
      stock: map[muestra.id] || 0,
    }));
  }, [movimientos.items, muestras.items, catalogs.ubicacionesMap]);

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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ ...row, fecha: toDateInput(row.fecha) });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      cantidad: toNumber(form.cantidad) || 0,
    };

    if (editing) {
      await movimientos.update(editing.id, payload);
    } else {
      await movimientos.create(payload);
    }

    closeModal();
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Inventario y bodega</h1>
          <p>
            Control de stock por muestra, ubicacion e historial de movimientos.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreate}>
          Nuevo movimiento
        </button>
      </header>

      <div className="panel-grid three-col">
        <article className="panel-card">
          <h3>Stock por muestra</h3>
          <DataGrid
            columns={[
              { key: "referencia", label: "Referencia" },
              { key: "modelo", label: "Modelo" },
              { key: "ubicacion", label: "Ubicacion" },
              { key: "stock", label: "Stock" },
            ]}
            rows={stockByMuestra}
          />
        </article>

        <article className="panel-card">
          <h3>Stock por ubicacion</h3>
          <DataGrid
            columns={[
              { key: "ubicacion", label: "Ubicacion" },
              { key: "stock", label: "Stock" },
            ]}
            rows={stockByUbicacion}
          />
        </article>
      </div>

      <article className="panel-card">
        <h3>Historial de movimientos</h3>
        <DataGrid
          columns={[
            { key: "muestraid", label: "Muestra" },
            { key: "tipo", label: "Tipo" },
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
              render: (row) =>
                catalogs.usuariosMap[row.usuarioid] || row.usuarioid,
            },
          ]}
          rows={movimientos.items}
          onEdit={openEdit}
          onDelete={(row) => movimientos.remove(row.id)}
        />
      </article>

      {modalOpen && (
        <Modal
          title={editing ? "Editar movimiento" : "Nuevo movimiento"}
          onClose={closeModal}
        >
          <form className="form-grid two-columns" onSubmit={submit}>
            <label>
              Muestra
              <select
                required
                value={form.muestraid || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    muestraid: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona</option>
                {muestras.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.referencia}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                required
                value={form.tipo || "entrada"}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, tipo: event.target.value }))
                }
              >
                <option value="entrada">entrada</option>
                <option value="salida">salida</option>
              </select>
            </label>
            <label>
              Cantidad
              <input
                type="number"
                required
                min="1"
                value={form.cantidad ?? 1}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cantidad: event.target.value }))
                }
              />
            </label>
            <label>
              Fecha
              <input
                type="date"
                required
                value={toDateInput(form.fecha)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fecha: event.target.value }))
                }
              />
            </label>
            <label>
              Motivo
              <input
                required
                value={form.motivo || ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, motivo: event.target.value }))
                }
              />
            </label>
            <label>
              Usuario
              <select
                required
                value={form.usuarioid || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    usuarioid: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona</option>
                {catalogs.usuarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
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
    </section>
  );
};
