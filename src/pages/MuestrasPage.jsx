import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";

const emptyForm = {
  referencia: "",
  modelo: "",
  segmento: "",
  pareselaborados: 0,
  fechaelaboracion: "",
  estado: "nueva",
  ubicacionid: "",
  molderiaid: "",
  clienteid: "",
  disenadorid: "",
  dima: "",
  licenciado: false,
  talla: "",
  proceso: "",
  observaciones: "",
};

export const MuestrasPage = () => {
  const muestras = useCrud(ENDPOINTS.muestras);
  const catalogs = useCatalogData();
  const [filters, setFilters] = useState({
    q: "",
    estado: "",
    segmento: "",
    clienteid: "",
    ubicacionid: "",
    licenciado: "",
    dima: "",
    from: "",
    to: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const { load: loadMuestras } = muestras;

  useEffect(() => {
    loadMuestras();
  }, [loadMuestras]);

  const designerOptions = useMemo(() => {
    const ids = new Set(
      muestras.items.map((item) => item.disenadorid).filter(Boolean),
    );
    return Array.from(ids);
  }, [muestras.items]);

  const filteredRows = useMemo(() => {
    return muestras.items.filter((row) => {
      if (filters.q) {
        const text = `${row.referencia} ${row.modelo}`.toLowerCase();
        if (!text.includes(filters.q.toLowerCase())) return false;
      }

      if (filters.estado && row.estado !== filters.estado) return false;
      if (filters.segmento && row.segmento !== filters.segmento) return false;
      if (filters.clienteid && row.clienteid !== filters.clienteid)
        return false;
      if (filters.ubicacionid && row.ubicacionid !== filters.ubicacionid)
        return false;
      if (filters.licenciado !== "") {
        const bool = filters.licenciado === "true";
        if (Boolean(row.licenciado) !== bool) return false;
      }
      if (
        filters.dima &&
        (row.dima || "").toLowerCase() !== filters.dima.toLowerCase()
      )
        return false;

      if (
        filters.from &&
        String(row.fechaelaboracion).slice(0, 10) < filters.from
      )
        return false;
      if (filters.to && String(row.fechaelaboracion).slice(0, 10) > filters.to)
        return false;

      return true;
    });
  }, [muestras.items, filters]);

  const resetAndClose = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...row,
      fechaelaboracion: toDateInput(row.fechaelaboracion),
    });
    setModalOpen(true);
  };

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      pareselaborados: toNumber(form.pareselaborados) || 0,
      talla: toNumber(form.talla),
      licenciado: Boolean(form.licenciado),
    };

    if (editing) {
      await muestras.update(editing.id, payload);
    } else {
      await muestras.create(payload);
    }

    resetAndClose();
  };

  const columns = [
    { key: "referencia", label: "Referencia" },
    { key: "modelo", label: "Modelo" },
    { key: "segmento", label: "Segmento" },
    { key: "estado", label: "Estado" },
    {
      key: "clienteid",
      label: "Cliente",
      render: (row) => catalogs.clientesMap[row.clienteid] || row.clienteid,
    },
    {
      key: "ubicacionid",
      label: "Ubicacion",
      render: (row) =>
        catalogs.ubicacionesMap[row.ubicacionid] || row.ubicacionid,
    },
    { key: "pareselaborados", label: "Pares" },
  ];

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Gestion de muestras</h1>
          <p>
            Registro, actualizacion, baja, filtros avanzados y clasificacion
            operativa.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreate}>
          Nueva muestra
        </button>
      </header>

      <div className="panel-card filters-grid">
        <input
          placeholder="Buscar referencia o modelo"
          value={filters.q}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, q: event.target.value }))
          }
        />
        <input
          placeholder="Segmento"
          value={filters.segmento}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, segmento: event.target.value }))
          }
        />
        <input
          placeholder="Estado"
          value={filters.estado}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, estado: event.target.value }))
          }
        />
        <select
          value={filters.clienteid}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, clienteid: event.target.value }))
          }
        >
          <option value="">Cliente</option>
          {catalogs.clientes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
        <select
          value={filters.ubicacionid}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, ubicacionid: event.target.value }))
          }
        >
          <option value="">Ubicacion</option>
          {catalogs.ubicaciones.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
        <select
          value={filters.licenciado}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, licenciado: event.target.value }))
          }
        >
          <option value="">Licencia</option>
          <option value="true">Licenciado</option>
          <option value="false">No licenciado</option>
        </select>
        <input
          placeholder="DIMA"
          value={filters.dima}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, dima: event.target.value }))
          }
        />
        <input
          type="date"
          value={filters.from}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, from: event.target.value }))
          }
        />
        <input
          type="date"
          value={filters.to}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, to: event.target.value }))
          }
        />
      </div>

      {muestras.loading ? (
        <p className="muted-text">Cargando muestras...</p>
      ) : null}
      {muestras.error ? <p className="error-text">{muestras.error}</p> : null}

      <DataGrid
        columns={columns}
        rows={filteredRows}
        onEdit={openEdit}
        onDelete={(row) => muestras.remove(row.id)}
      />

      {modalOpen && (
        <Modal
          title={editing ? "Editar muestra" : "Nueva muestra"}
          onClose={resetAndClose}
        >
          <form className="form-grid two-columns" onSubmit={onSubmit}>
            <label>
              Referencia
              <input
                required
                value={form.referencia || ""}
                onChange={(event) => onChange("referencia", event.target.value)}
              />
            </label>
            <label>
              Modelo
              <input
                required
                value={form.modelo || ""}
                onChange={(event) => onChange("modelo", event.target.value)}
              />
            </label>
            <label>
              Segmento
              <input
                required
                value={form.segmento || ""}
                onChange={(event) => onChange("segmento", event.target.value)}
              />
            </label>
            <label>
              DIMA
              <input
                value={form.dima || ""}
                onChange={(event) => onChange("dima", event.target.value)}
              />
            </label>
            <label>
              Pares elaborados
              <input
                required
                type="number"
                min="0"
                value={form.pareselaborados ?? 0}
                onChange={(event) =>
                  onChange("pareselaborados", event.target.value)
                }
              />
            </label>
            <label>
              Talla
              <input
                type="number"
                min="0"
                value={form.talla || ""}
                onChange={(event) => onChange("talla", event.target.value)}
              />
            </label>
            <label>
              Fecha elaboracion
              <input
                required
                type="date"
                value={toDateInput(form.fechaelaboracion)}
                onChange={(event) =>
                  onChange("fechaelaboracion", event.target.value)
                }
              />
            </label>
            <label>
              Estado
              <select
                value={form.estado || "nueva"}
                onChange={(event) => onChange("estado", event.target.value)}
              >
                <option value="nueva">nueva</option>
                <option value="presentada">presentada</option>
                <option value="aprobada">aprobada</option>
                <option value="rechazada">rechazada</option>
                <option value="reutilizable">reutilizable</option>
              </select>
            </label>
            <label>
              Cliente
              <select
                required
                value={form.clienteid || ""}
                onChange={(event) => onChange("clienteid", event.target.value)}
              >
                <option value="">Selecciona</option>
                {catalogs.clientes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Molderia
              <select
                required
                value={form.molderiaid || ""}
                onChange={(event) => onChange("molderiaid", event.target.value)}
              >
                <option value="">Selecciona</option>
                {catalogs.molderias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ubicacion
              <select
                required
                value={form.ubicacionid || ""}
                onChange={(event) =>
                  onChange("ubicacionid", event.target.value)
                }
              >
                <option value="">Selecciona</option>
                {catalogs.ubicaciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Disenador ID
              <input
                list="designer-list"
                required
                value={form.disenadorid || ""}
                onChange={(event) =>
                  onChange("disenadorid", event.target.value)
                }
                placeholder="UUID disenador"
              />
              <datalist id="designer-list">
                {designerOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </label>
            <label>
              Proceso
              <input
                value={form.proceso || ""}
                onChange={(event) => onChange("proceso", event.target.value)}
              />
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={Boolean(form.licenciado)}
                onChange={(event) =>
                  onChange("licenciado", event.target.checked)
                }
              />
              Licenciado
            </label>
            <label className="full-width">
              Observaciones
              <textarea
                rows="3"
                value={form.observaciones || ""}
                onChange={(event) =>
                  onChange("observaciones", event.target.value)
                }
              />
            </label>

            <div className="form-actions full-width">
              <button
                type="button"
                className="ghost-btn"
                onClick={resetAndClose}
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
