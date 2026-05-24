import { useEffect, useRef, useState } from "react";
import { FiUpload, FiCheckCircle, FiAlertCircle, FiLoader } from "react-icons/fi";
import { api } from "../api/client";

const IMPORT_STATUS_KEY = "cmstock_import_status";

const readImportStatus = () => {
  try {
    const raw = sessionStorage.getItem(IMPORT_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeImportStatus = (value) => {
  try {
    if (value) {
      sessionStorage.setItem(IMPORT_STATUS_KEY, JSON.stringify(value));
    } else {
      sessionStorage.removeItem(IMPORT_STATUS_KEY);
    }
  } catch {
    // Ignorar errores de almacenamiento para no bloquear la importación.
  }
};

export const ImportacionComponent = ({ onImportComplete }) => {
  const [files, setFiles] = useState({
    baseDis: null,
    aprobaciones: null,
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(() => readImportStatus());
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [dragActive, setDragActive] = useState({
    baseDis: false,
    aprobaciones: false
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDrag = (e, fileType) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive((prev) => ({ ...prev, [fileType]: true }));
    } else if (e.type === "dragleave") {
      setDragActive((prev) => ({ ...prev, [fileType]: false }));
    }
  };

  const handleDrop = (e, fileType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [fileType]: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect({ target: { files: e.dataTransfer.files } }, fileType);
    }
  };

  const handleFileSelect = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        setError(`${fileType}: Solo se aceptan archivos Excel (.xlsx, .xls)`);
        return;
      }
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!files.baseDis || !files.aprobaciones) {
      setError('Debes seleccionar ambos archivos (BASE DIS y APROBACIONES)');
      return;
    }

    const runningStatus = {
      phase: "running",
      message: "La importación está en curso. Puedes cambiar de página y volver para ver el resultado.",
      startedAt: Date.now(),
    };

    writeImportStatus(runningStatus);
    if (isMountedRef.current) {
      setStatus(runningStatus);
    }

    setLoading(true);
    setProgress('Iniciando importación...');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('baseDis', files.baseDis);
      formData.append('aprobaciones', files.aprobaciones);

      setProgress('Subiendo archivos...');

      const response = await api.postForm('/importacion/todos', formData);

      if (response && response.success) {
        const successStatus = {
          phase: "success",
          baseDis: response.data?.baseDis,
          aprobaciones: response.data?.aprobaciones,
          finishedAt: Date.now(),
          message: response.message || 'Importación completada correctamente',
        };

        writeImportStatus(successStatus);

        if (isMountedRef.current) {
          setStatus(successStatus);
          setFiles({ baseDis: null, aprobaciones: null });
          setProgress(null);
        }

        if (onImportComplete) {
          onImportComplete(response.data);
        }
      } else {
        const message = response.message || response.data?.message || 'Error en la importación';
        const errorStatus = {
          phase: "error",
          message,
          finishedAt: Date.now(),
        };

        writeImportStatus(errorStatus);

        if (isMountedRef.current) {
          setError(message);
          setStatus(errorStatus);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      const message = err.response?.data?.message || err.message || 'Error en la importación';
      const errorStatus = {
        phase: "error",
        message,
        finishedAt: Date.now(),
      };

      writeImportStatus(errorStatus);

      if (isMountedRef.current) {
        setError(message);
        setStatus(errorStatus);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setProgress(null);
      }
    }
  };

  const clearLastResult = () => {
    writeImportStatus(null);
    setStatus(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FiUpload className="text-indigo-600" />
          Importar datos desde Excel
        </h2>

        <div className="space-y-4">
          {/* BASE DIS File */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              📊 Archivo BASE DIS.xlsx
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e, 'baseDis')}
                disabled={loading}
                className="hidden"
                id="baseDis-input"
              />
              <label
                htmlFor="baseDis-input"
                onDragEnter={(e) => handleDrag(e, 'baseDis')}
                onDragLeave={(e) => handleDrag(e, 'baseDis')}
                onDragOver={(e) => handleDrag(e, 'baseDis')}
                onDrop={(e) => handleDrop(e, 'baseDis')}
                className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${dragActive.baseDis
                    ? "border-indigo-500 bg-indigo-100"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
              >
                {files.baseDis ? (
                  <span className="text-green-600 font-semibold flex items-center justify-center gap-2">
                    <FiCheckCircle /> {files.baseDis.name}
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Haz clic para seleccionar o arrastra el archivo aquí
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* APROBACIONES File */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ✅ Archivo Control Diseño.xlsx
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e, 'aprobaciones')}
                disabled={loading}
                className="hidden"
                id="aprobaciones-input"
              />
              <label
                htmlFor="aprobaciones-input"
                onDragEnter={(e) => handleDrag(e, 'aprobaciones')}
                onDragLeave={(e) => handleDrag(e, 'aprobaciones')}
                onDragOver={(e) => handleDrag(e, 'aprobaciones')}
                onDrop={(e) => handleDrop(e, 'aprobaciones')}
                className={`block w-full px-4 py-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${dragActive.aprobaciones
                    ? "border-indigo-500 bg-indigo-100"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
              >
                {files.aprobaciones ? (
                  <span className="text-green-600 font-semibold flex items-center justify-center gap-2">
                    <FiCheckCircle /> {files.aprobaciones.name}
                  </span>
                ) : (
                  <span className="text-slate-600">
                    Haz clic para seleccionar o arrastra el archivo aquí
                  </span>
                )}
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <FiAlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Progress Message */}
          {progress && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <FiLoader className="text-blue-600 animate-spin flex-shrink-0" />
              <p className="text-blue-800 text-sm">{progress}</p>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={loading || !files.baseDis || !files.aprobaciones}
            className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${loading || !files.baseDis || !files.aprobaciones
                ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <FiUpload />
                Importar Datos
              </>
            )}
          </button>
        </div>
      </div>


      {/* Estado persistente */}
      {status?.phase === "running" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <FiLoader className="mt-0.5 animate-spin text-blue-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-blue-900">Importación en curso</p>
              <p className="mt-1 text-sm text-blue-800">{status.message}</p>
              <p className="mt-2 text-xs text-blue-700/80">
                Si cambias de página, este estado queda guardado hasta que termine la importación.
              </p>
            </div>
            <button
              type="button"
              onClick={clearLastResult}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {status?.phase === "success" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 text-emerald-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-900">Última importación completada</p>
                <p className="mt-1 text-sm text-emerald-800">{status.message}</p>
                <p className="mt-2 text-xs text-emerald-700/80">
                  Puedes volver a esta pantalla en cualquier momento para revisar el resultado.
                </p>
              </div>
              <button
                type="button"
                onClick={clearLastResult}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BASE DIS Result */}
            {status.baseDis && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <FiCheckCircle className="text-green-600 mt-0.5" />
                  <h3 className="font-semibold text-green-900">BASE DIS 2025</h3>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-green-700">Registros procesados:</dt>
                    <dd className="font-semibold text-green-900">{status.baseDis.procesados}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-green-700">Nuevos creados:</dt>
                    <dd className="font-semibold text-green-900">{status.baseDis.creados}</dd>
                  </div>
                  {status.baseDis.variacionesCreadas > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-green-700">Variaciones creadas:</dt>
                      <dd className="font-semibold text-green-900">{status.baseDis.variacionesCreadas}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* APROBACIONES Result */}
            {status.aprobaciones && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <FiCheckCircle className="text-green-600 mt-0.5" />
                  <h3 className="font-semibold text-green-900">Aprobaciones</h3>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-green-700">Registros procesados:</dt>
                    <dd className="font-semibold text-green-900">{status.aprobaciones.procesados}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-green-700">Presentaciones creadas:</dt>
                    <dd className="font-semibold text-green-900">{status.aprobaciones.creados}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>

          {/* ERRORES - Si existen */}
          {(status.baseDis?.errores?.length > 0 || status.aprobaciones?.errores?.length > 0) && (
            <div className="bg-orange-50 border-l-4 border-orange-400 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <FiAlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" />
                <h3 className="font-semibold text-orange-900">Errores encontrados durante la importación</h3>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {status.baseDis?.errores?.map((error, idx) => (
                  <div key={`basedis-error-${idx}`} className="text-sm text-orange-800 font-mono bg-white p-2 rounded border border-orange-200">
                    ❌ {error}
                  </div>
                ))}
                {status.aprobaciones?.errores?.map((error, idx) => (
                  <div key={`aprobaciones-error-${idx}`} className="text-sm text-orange-800 font-mono bg-white p-2 rounded border border-orange-200">
                    ❌ {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {status?.phase === "error" && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="mt-0.5 text-rose-600 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-900">La importación falló</p>
              <p className="mt-1 text-sm text-rose-800">{status.message}</p>
              <p className="mt-2 text-xs text-rose-700/80">
                El mensaje también quedó guardado para que puedas revisarlo al volver a esta pantalla.
              </p>
            </div>
            <button
              type="button"
              onClick={clearLastResult}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900 mb-2">
          <strong>ℹ️ Información importante:</strong>
        </p>
        <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
          <li>Los registros existentes NO serán sobrescritos</li>
          <li>Se crearán nuevos registros para datos que no existan</li>
          <li>La importación verifica automáticamente duplicados</li>
          <li>El proceso puede tomar varios minutos con muchos datos</li>
        </ul>
      </div>
    </div>
  );
};
