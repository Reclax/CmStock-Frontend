import { useEffect, useMemo, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { DataGrid } from "../components/DataGrid";
import { Modal } from "../components/Modal";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { toDateInput, toNumber } from "../utils/format";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiArrowUp,
  FiArrowDown,
} from "react-icons/fi";

const PAGE_SIZE = 25;

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
    <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
      {value}
    </span>
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
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  return {
    search,
    setSearch,
    page,
    setPage,
    totalPages,
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

  useEffect(() => {
    movimientos.load();
    muestras.load();
  }, []);

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
      ubicacion:
        catalogs.ubicacionesMap[m.ubicacionid] || m.ubicacionid,
      stock: map[m.id] || 0,
    }));
  }, [movimientos.items, muestras.items, catalogs.ubicacionesMap]);

  const muestraLabelById = useMemo(() => {
    return Object.fromEntries(
      muestras.items.map((m) => [
        m.id,
        `${m.referencia} · ${m.modelo}`,
      ])
    );
  }, [muestras.items]);

  const stockByUbicacion = useMemo(() => {
    const map = {};
    for (const item of stockByMuestra) {
      map[item.ubicacion] =
        (map[item.ubicacion] || 0) + item.stock;
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
    setForm(emptyForm);
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

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      cantidad: toNumber(form.cantidad),
    };

    if (editing) {
      await movimientos.update(editing.id, payload);
    } else {
      await movimientos.create(payload);
    }

    setModalOpen(false);
  };

  const deleteRow = async () => {
    await movimientos.remove(rowToDelete.id);
    setRowToDelete(null);
  };

  // =========================
  // UI
  // =========================
  const renderTable = (state, columns) => (
    <>
      <input
        placeholder="Buscar..."
        value={state.search}
        onChange={(e) => {
          state.setSearch(e.target.value);
          state.setPage(1);
        }}
        className="mb-3 w-full border rounded-xl px-3 py-2"
      />

      <DataGrid columns={columns} rows={state.rows} />

      <div className="flex justify-between mt-3 text-sm">
        <button
          disabled={state.page === 1}
          onClick={() => state.setPage(state.page - 1)}
        >
          Anterior
        </button>

        <span>
          Página {state.page} de {state.totalPages || 1}
        </span>

        <button
          disabled={state.page === state.totalPages}
          onClick={() => state.setPage(state.page + 1)}
        >
          Siguiente
        </button>
      </div>
    </>
  );

  return (
    <section className="space-y-6">
      <header className="flex justify-between">
        <h1 className="text-xl font-semibold">
          Inventario y bodega
        </h1>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#1B3D8F] text-white px-4 py-2 rounded-xl"
        >
          <FiPlus /> Nuevo
        </button>
      </header>

      <div className="flex gap-2">
        {["stock", "historial", "ubicacion"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded ${
              tab === t ? "bg-[#1B3D8F] text-white" : "bg-slate-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "stock" &&
        renderTable(stockState, [
          { key: "referencia", label: "Referencia" },
          { key: "modelo", label: "Modelo" },
          {
            key: "ubicacion",
            label: "Ubicación",
            render: (row) => (
              <UbicacionBadge value={row.ubicacion} />
            ),
          },
          {
            key: "stock",
            label: "Stock",
            render: (row) => <StockBadge value={row.stock} />,
          },
        ])}

      {tab === "historial" &&
        renderTable(historialState, [
          {
            key: "muestraid",
            label: "Muestra",
            render: (row) =>
              muestraLabelById[row.muestraid],
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
            key: "acciones",
            label: "",
            render: (row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)}>
                  <FiEdit />
                </button>
                <button
                  onClick={() => setRowToDelete(row)}
                  className="text-rose-500"
                >
                  <FiTrash2 />
                </button>
              </div>
            ),
          },
        ])}

      {tab === "ubicacion" &&
        renderTable(ubicacionState, [
          {
            key: "ubicacion",
            label: "Ubicación",
            render: (row) => (
              <UbicacionBadge value={row.ubicacion} />
            ),
          },
          {
            key: "stock",
            label: "Stock",
            render: (row) => (
              <StockBadge value={row.stock} />
            ),
          },
        ])}

      {/* DELETE */}
      {rowToDelete && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
          <div className="bg-white p-6 rounded-xl">
            <p>¿Eliminar registro?</p>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setRowToDelete(null)}>
                Cancelar
              </button>
              <button
                onClick={deleteRow}
                className="bg-rose-600 text-white px-3 py-1 rounded"
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