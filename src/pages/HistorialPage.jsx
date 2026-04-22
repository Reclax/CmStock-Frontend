import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";

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

  const columnsByTab = {
    presentaciones: [
      { key: "muestraid", label: "Muestra", render: (row) => row.muestraid },
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
      { key: "muestraid", label: "Muestra" },
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
      { key: "muestraid", label: "Muestra" },
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
    <section>
      <header className="section-header">
        <div>
          <h1>Historial y trazabilidad</h1>
          <p>
            Control de presentaciones, produccion y fases del flujo de muestra.
          </p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => openForm()}
        >
          Nuevo registro
        </button>
      </header>

      <div className="tabs-row">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? "tab-btn tab-btn-active" : "tab-btn"}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <DataGrid
        columns={columnsByTab[tab]}
        rows={service.items}
        onEdit={openForm}
        onDelete={(row) => service.remove(row.id)}
      />

      {modalOpen && (
        <Modal
          title={editing ? "Editar registro" : "Nuevo registro"}
          onClose={closeForm}
        >
          <form className="form-grid two-columns" onSubmit={onSubmit}>
            {tab === "presentaciones" && (
              <>
                <label>
                  Muestra
                  <select
                    required
                    value={form.muestraid || ""}
                    onChange={(event) =>
                      onChange("muestraid", event.target.value)
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
                  Cliente
                  <select
                    required
                    value={form.clienteid || ""}
                    onChange={(event) =>
                      onChange("clienteid", event.target.value)
                    }
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
                  Fecha
                  <input
                    type="date"
                    required
                    value={toDateInput(form.fecha)}
                    onChange={(event) => onChange("fecha", event.target.value)}
                  />
                </label>
                <label>
                  Resultado
                  <input
                    required
                    value={form.resultado || ""}
                    onChange={(event) =>
                      onChange("resultado", event.target.value)
                    }
                  />
                </label>
                <label>
                  Pares aprobados
                  <input
                    type="number"
                    min="0"
                    value={form.paresaprobados || ""}
                    onChange={(event) =>
                      onChange("paresaprobados", event.target.value)
                    }
                  />
                </label>
                <label>
                  Pares rechazados
                  <input
                    type="number"
                    min="0"
                    value={form.paresrechazados || ""}
                    onChange={(event) =>
                      onChange("paresrechazados", event.target.value)
                    }
                  />
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={Boolean(form.derivoproduccion)}
                    onChange={(event) =>
                      onChange("derivoproduccion", event.target.checked)
                    }
                  />
                  Derivo en produccion
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
              </>
            )}

            {tab === "producciones" && (
              <>
                <label>
                  Muestra
                  <select
                    required
                    value={form.muestraid || ""}
                    onChange={(event) =>
                      onChange("muestraid", event.target.value)
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
                  Cliente
                  <select
                    required
                    value={form.clienteid || ""}
                    onChange={(event) =>
                      onChange("clienteid", event.target.value)
                    }
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
                  Orden produccion
                  <input
                    required
                    value={form.ordennumero || ""}
                    onChange={(event) =>
                      onChange("ordennumero", event.target.value)
                    }
                  />
                </label>
                <label>
                  Pares producidos
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.paresproducidos || ""}
                    onChange={(event) =>
                      onChange("paresproducidos", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha produccion
                  <input
                    required
                    type="date"
                    value={toDateInput(form.fechaproduccion)}
                    onChange={(event) =>
                      onChange("fechaproduccion", event.target.value)
                    }
                  />
                </label>
                <label>
                  Mes
                  <input
                    required
                    value={form.mes || ""}
                    onChange={(event) => onChange("mes", event.target.value)}
                  />
                </label>
              </>
            )}

            {tab === "trazabilidades" && (
              <>
                <label>
                  Muestra
                  <select
                    required
                    value={form.muestraid || ""}
                    onChange={(event) =>
                      onChange("muestraid", event.target.value)
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
                  Disenador ID
                  <input
                    list="hist-disenadores"
                    required
                    value={form.disenadorid || ""}
                    onChange={(event) =>
                      onChange("disenadorid", event.target.value)
                    }
                  />
                  <datalist id="hist-disenadores">
                    {disenadorIds.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Modelador ID
                  <input
                    list="hist-modeladores"
                    required
                    value={form.modeladorid || ""}
                    onChange={(event) =>
                      onChange("modeladorid", event.target.value)
                    }
                  />
                  <datalist id="hist-modeladores">
                    {modeladorIds.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Fecha requerimiento
                  <input
                    required
                    type="date"
                    value={toDateInput(form.fecharequerimiento)}
                    onChange={(event) =>
                      onChange("fecharequerimiento", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha diseno
                  <input
                    required
                    type="date"
                    value={toDateInput(form.fechadiseno)}
                    onChange={(event) =>
                      onChange("fechadiseno", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha molderia
                  <input
                    required
                    type="date"
                    value={toDateInput(form.fechamolderia)}
                    onChange={(event) =>
                      onChange("fechamolderia", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha registro
                  <input
                    required
                    type="date"
                    value={toDateInput(form.fecharegistro)}
                    onChange={(event) =>
                      onChange("fecharegistro", event.target.value)
                    }
                  />
                </label>
                <label>
                  Tiempos
                  <input
                    value={form.tiempos || ""}
                    onChange={(event) =>
                      onChange("tiempos", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            <div className="form-actions full-width">
              <button type="button" className="ghost-btn" onClick={closeForm}>
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
