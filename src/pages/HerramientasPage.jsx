import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ENDPOINTS } from "../api/endpoints";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { downloadTemplate, readExcelFile } from "../utils/excel";

export const HerramientasPage = () => {
  const catalogs = useCatalogData();
  const navigate = useNavigate();
  const muestras = useCrud(ENDPOINTS.muestras);
  const [importRows, setImportRows] = useState([]);
  const [importMsg, setImportMsg] = useState("");
  const { load: loadMuestras } = muestras;

  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    loadMuestras();
  }, [loadMuestras]);

  const onImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const rows = await readExcelFile(file);
    setImportRows(rows);
    setImportMsg(`Archivo cargado con ${rows.length} filas`);
  };

  const executeImport = async () => {
    if (!importRows.length) {
      setImportMsg("No hay filas para importar");
      return;
    }

    let ok = 0;
    let fail = 0;

    for (const row of importRows) {
      try {
        const clienteByName = catalogs.clientes.find(
          (item) =>
            item.nombre.toLowerCase() ===
            String(row.CLIENTE || "").toLowerCase(),
        );

        const molderiaByName = catalogs.molderias.find(
          (item) =>
            item.nombre.toLowerCase() ===
            String(row.MOLDERIA || "").toLowerCase(),
        );

        const ubicacion = catalogs.ubicaciones[0];
        const referencia = String(row.REF || "").trim();
        const fecha =
          String(row.FECHAS || "").slice(0, 10) ||
          new Date().toISOString().slice(0, 10);

        if (!clienteByName || !molderiaByName || !ubicacion || !referencia) {
          fail += 1;
          continue;
        }

        const fallbackDisenador = muestras.items[0]?.disenadorid;
        if (!fallbackDisenador) {
          fail += 1;
          continue;
        }

        await muestras.create({
          referencia,
          modelo: String(row.MARCA || "Sin modelo"),
          molderiaid: molderiaByName.id,
          disenadorid: fallbackDisenador,
          clienteid: clienteByName.id,
          segmento: String(row.SEGMENTO || "general"),
          pareselaborados: Number(row.PARES || 0),
          fechaelaboracion: fecha,
          estado: String(row.APROBACION || "nueva").toLowerCase() || "nueva",
          ubicacionid: ubicacion.id,
          dima: String(row.DIMA || ""),
          licenciado: String(row.LICENCIA || "")
            .toLowerCase()
            .includes("si"),
          talla: Number(row.TALLA || 0),
          proceso: String(row.PROCESO || ""),
          observaciones: String(row.OBSERVACIONES || ""),
        });

        ok += 1;
      } catch {
        fail += 1;
      }
    }

    setImportMsg(`Importacion finalizada. Exitos: ${ok} | Errores: ${fail}`);
    await muestras.load();
  };

  const openImagenes = () => navigate("/imagenes");

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Herramientas avanzadas</h1>
          <p>Importacion Excel y gestion de fotografias.</p>
        </div>
      </header>

      <div className="panel-grid two-col">
        <article className="panel-card">
          <h3>Importacion desde Excel</h3>
          <p className="muted-text">
            Plantilla: ORDEN Nº, MES, REF, PARES, MARCA, MOLDERIA, SEGMENTO,
            LICENCIA, DIMA...
          </p>
          <div className="button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={downloadTemplate}
            >
              Descargar plantilla
            </button>
            <input type="file" accept=".xlsx,.xls" onChange={onImportFile} />
            <button
              type="button"
              className="primary-btn"
              onClick={executeImport}
            >
              Importar filas
            </button>
          </div>
          {importMsg && <p className="muted-text">{importMsg}</p>}
          {importRows.length > 0 && (
            <p className="muted-text">
              Vista previa cargada: {importRows.length} registros
            </p>
          )}
        </article>

        <article className="panel-card">
          <h3>Gestion de imagenes</h3>
          <p className="muted-text">
            La carga y reorden de fotos se gestiona en una pagina dedicada.
          </p>
          <div className="button-row">
            <button type="button" className="primary-btn" onClick={openImagenes}>
              Ir a imagenes
            </button>
          </div>
        </article>
      </div>
    </section>
  );
};
