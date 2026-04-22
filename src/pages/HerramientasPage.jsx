import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { ENDPOINTS } from "../api/endpoints";
import { useAuth } from "../auth/useAuth";
import { DataGrid } from "../components/DataGrid";
import { useCatalogData } from "../hooks/useCatalogData";
import { useCrud } from "../hooks/useCrud";
import { downloadTemplate, readExcelFile } from "../utils/excel";
import { generateBarcodeDataUrl, generateQrDataUrl } from "../utils/qr";

export const HerramientasPage = () => {
  const catalogs = useCatalogData();
  const { user } = useAuth();
  const muestras = useCrud(ENDPOINTS.muestras);
  const fotos = useCrud(ENDPOINTS.fotos);
  const [selectedMuestra, setSelectedMuestra] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [barcodeUrl, setBarcodeUrl] = useState("");
  const [scanResult, setScanResult] = useState("");
  const [scanError, setScanError] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importMsg, setImportMsg] = useState("");
  const [photoForm, setPhotoForm] = useState({
    muestraid: "",
    urlarchivo: "",
    origen: "archivo",
    fechacarga: "",
  });
  const { load: loadMuestras } = muestras;
  const { load: loadFotos } = fotos;

  const videoRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    loadMuestras();
    loadFotos();
  }, [loadMuestras, loadFotos]);

  useEffect(() => {
    const run = async () => {
      if (!selectedMuestra) {
        setQrUrl("");
        setBarcodeUrl("");
        return;
      }

      const data = `CMSTOCK:${selectedMuestra}`;
      const qr = await generateQrDataUrl(data);
      const barcode = generateBarcodeDataUrl(data);
      setQrUrl(qr);
      setBarcodeUrl(barcode);
    };

    run();
  }, [selectedMuestra]);

  const selectedMuestraData = useMemo(
    () => muestras.items.find((item) => item.id === selectedMuestra),
    [muestras.items, selectedMuestra],
  );

  const startScanner = async () => {
    setScanError("");

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setScannerActive(true);

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;

      if (!deviceId || !videoRef.current) {
        setScanError("No se encontro camara disponible.");
        return;
      }

      await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const raw = result.getText();
            setScanResult(raw);
            const id = raw.replace("CMSTOCK:", "");
            const match = muestras.items.find((item) => item.id === id);
            if (match) {
              setSelectedMuestra(match.id);
            }
            reader.reset();
            setScannerActive(false);
          }

          if (error && error.name !== "NotFoundException") {
            setScanError("Error durante escaneo.");
          }
        },
      );
    } catch {
      setScanError("No fue posible iniciar el scanner.");
    }
  };

  const stopScanner = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    setScannerActive(false);
  };

  const printLabel = () => {
    window.print();
  };

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

  const savePhoto = async (event) => {
    event.preventDefault();

    await fotos.create({
      ...photoForm,
      usuarioid: user.id,
    });

    setPhotoForm({
      muestraid: "",
      urlarchivo: "",
      origen: "archivo",
      fechacarga: "",
    });
  };

  return (
    <section>
      <header className="section-header">
        <div>
          <h1>Herramientas avanzadas</h1>
          <p>
            QR/codigo de barras, importacion Excel y gestion de fotografias.
          </p>
        </div>
      </header>

      <div className="panel-grid two-col">
        <article className="panel-card printable-label">
          <h3>QR y codigo de barras por muestra</h3>
          <label>
            Muestra
            <select
              value={selectedMuestra}
              onChange={(event) => setSelectedMuestra(event.target.value)}
            >
              <option value="">Selecciona</option>
              {muestras.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.referencia}
                </option>
              ))}
            </select>
          </label>

          {selectedMuestraData && (
            <div className="qr-preview">
              <p>
                {selectedMuestraData.referencia} - {selectedMuestraData.modelo}
              </p>
              {qrUrl && (
                <img src={qrUrl} alt="QR muestra" width="180" height="180" />
              )}
              {barcodeUrl && <img src={barcodeUrl} alt="Codigo barras" />}
            </div>
          )}

          <div className="button-row">
            <button
              type="button"
              className="secondary-btn"
              onClick={printLabel}
            >
              Imprimir etiqueta
            </button>
          </div>
        </article>

        <article className="panel-card">
          <h3>Escaner PWA</h3>
          <p className="muted-text">
            Usa la camara para consultar muestra y navegar su informacion.
          </p>
          <video ref={videoRef} className="scanner-video" muted />
          <div className="button-row">
            {!scannerActive ? (
              <button
                type="button"
                className="primary-btn"
                onClick={startScanner}
              >
                Iniciar escaneo
              </button>
            ) : (
              <button
                type="button"
                className="danger-btn"
                onClick={stopScanner}
              >
                Detener
              </button>
            )}
          </div>
          {scanResult && <p className="muted-text">Resultado: {scanResult}</p>}
          {scanError && <p className="error-text">{scanError}</p>}
        </article>
      </div>

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
          <h3>Fotografias de muestras</h3>
          <form className="form-grid" onSubmit={savePhoto}>
            <label>
              Muestra
              <select
                required
                value={photoForm.muestraid}
                onChange={(event) =>
                  setPhotoForm((prev) => ({
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
              URL archivo
              <input
                required
                value={photoForm.urlarchivo}
                onChange={(event) =>
                  setPhotoForm((prev) => ({
                    ...prev,
                    urlarchivo: event.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </label>
            <label>
              Origen
              <select
                value={photoForm.origen}
                onChange={(event) =>
                  setPhotoForm((prev) => ({
                    ...prev,
                    origen: event.target.value,
                  }))
                }
              >
                <option value="archivo">archivo</option>
                <option value="camara">camara</option>
                <option value="pwa">pwa</option>
              </select>
            </label>
            <label>
              Fecha carga
              <input
                type="date"
                required
                value={photoForm.fechacarga}
                onChange={(event) =>
                  setPhotoForm((prev) => ({
                    ...prev,
                    fechacarga: event.target.value,
                  }))
                }
              />
            </label>
            <button type="submit" className="primary-btn">
              Guardar foto
            </button>
          </form>

          <DataGrid
            columns={[
              { key: "muestraid", label: "Muestra" },
              { key: "urlarchivo", label: "URL" },
              { key: "origen", label: "Origen" },
              { key: "fechacarga", label: "Fecha" },
            ]}
            rows={fotos.items}
            onDelete={(row) => fotos.remove(row.id)}
          />
        </article>
      </div>
    </section>
  );
};
