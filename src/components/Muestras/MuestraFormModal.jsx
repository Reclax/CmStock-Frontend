import Select from "react-select";
import { FiCamera, FiTrash2, FiUploadCloud } from "react-icons/fi";
import { Modal } from "../Modal";
import { CameraCapture } from "./CameraCapture";
import { FieldWrap, inputCls, selectStyles } from "./MuestrasUI";
import { ESTADO_META } from "./MuestrasUtils";
import { toDateInput } from "../../utils/format";
import { API_ROOT_URL } from "../../api/client";

export const MuestraFormModal = ({
  editing,
  form,
  onChange,
  onSubmit,
  isSaving,
  resetAndClose,
  dimaSelectOptions,
  clienteOptions,
  molderiaOptions,
  setNewMolderiaName,
  setMolderiaPromptOpen,
  ubicacionOptions,
  disenadorOptions,
  procesoSelectOptions,
  photoFileRef,
  handlePhotoFileUpload,
  uploadingPhoto,
  startCamera,
  cameraOpen,
  editPhotos,
  deletePhoto,
  pendingPhotos,
  removePendingPhoto,
  videoRef,
  canvasRef,
  stopCamera,
  handleCameraCapture
}) => {
  return (
    <Modal
      title={editing ? "Editar muestra" : "Nueva muestra"}
      onClose={resetAndClose}
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <FieldWrap label="Referencia">
          <input
            className={inputCls}
            required
            value={form.referencia || ""}
            onChange={(e) => onChange("referencia", e.target.value)}
            placeholder="Ej: REF-001"
          />
        </FieldWrap>
        <FieldWrap label="Segmento">
          <input
            className={inputCls}
            required
            value={form.segmento || ""}
            onChange={(e) => onChange("segmento", e.target.value)}
            placeholder="Ej: Dama, Caballero..."
          />
        </FieldWrap>
        <FieldWrap label="DIMA">
          <Select
            options={dimaSelectOptions}
            placeholder="Selecciona DIMA"
            value={
              dimaSelectOptions.find((o) => o.value === (form.dima || "")) ||
              null
            }
            onChange={(option) => onChange("dima", option ? option.value : "")}
            isClearable
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <FieldWrap label="Pares elaborados">
          <input
            className={inputCls}
            required
            type="number"
            min="0"
            value={form.pareselaborados ?? 0}
            onChange={(e) => onChange("pareselaborados", e.target.value)}
          />
        </FieldWrap>
        <FieldWrap label="Talla">
          <input
            className={inputCls}
            type="number"
            min="0"
            value={form.talla || ""}
            onChange={(e) => onChange("talla", e.target.value)}
            placeholder="Talla base"
          />
        </FieldWrap>
        <FieldWrap label="Fecha de elaboración">
          <input
            className={inputCls}
            required
            type="date"
            value={toDateInput(form.fechaelaboracion)}
            onChange={(e) => onChange("fechaelaboracion", e.target.value)}
          />
        </FieldWrap>
        <FieldWrap label="Estado">
          <select
            className={inputCls}
            value={form.estado || "nueva"}
            onChange={(e) => onChange("estado", e.target.value)}
          >
            {Object.entries(ESTADO_META).map(([val, { label }]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </FieldWrap>
        <FieldWrap label="Cliente">
          <Select
            options={clienteOptions}
            placeholder="Selecciona un cliente"
            value={
              clienteOptions.find((o) => o.value === form.clienteid) || null
            }
            onChange={(option) =>
              onChange("clienteid", option ? option.value : "")
            }
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <FieldWrap label="Moldería">
          <Select
            options={molderiaOptions}
            placeholder="Selecciona moldería"
            value={
              molderiaOptions.find((o) => o.value === form.molderiaid) || null
            }
            onChange={(option) => {
              if (option?.value === "__new__") {
                setNewMolderiaName("");
                setMolderiaPromptOpen(true);
                return;
              }
              onChange("molderiaid", option ? option.value : "");
            }}
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <FieldWrap label="Ubicación">
          <Select
            options={ubicacionOptions}
            placeholder="Selecciona ubicación"
            value={
              ubicacionOptions.find((o) => o.value === form.ubicacionid) || null
            }
            onChange={(option) =>
              onChange("ubicacionid", option ? option.value : "")
            }
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <FieldWrap label="Diseñador">
          <Select
            options={disenadorOptions}
            placeholder="Selecciona diseñador"
            value={
              disenadorOptions.find((o) => o.value === form.disenadorid) || null
            }
            onChange={(option) =>
              onChange("disenadorid", option ? option.value : "")
            }
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <FieldWrap label="Proceso">
          <Select
            options={procesoSelectOptions}
            placeholder="Selecciona proceso"
            value={
              procesoSelectOptions.find(
                (o) => o.value === (form.proceso || "")
              ) || null
            }
            onChange={(option) =>
              onChange("proceso", option ? option.value : "")
            }
            isClearable
            menuPlacement="bottom"
            menuPortalTarget={document.body}
            styles={selectStyles}
          />
        </FieldWrap>
        <div className="flex items-center gap-2.5 pt-1">
          <input
            id="licenciado-check"
            type="checkbox"
            checked={Boolean(form.licenciado)}
            onChange={(e) => onChange("licenciado", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#1B3D8F] focus:ring-[#1B3D8F]"
          />
          <label
            htmlFor="licenciado-check"
            className="text-sm font-semibold text-slate-700"
          >
            Licenciado
          </label>
        </div>
        <FieldWrap label="Observaciones" full>
          <textarea
            className={inputCls}
            rows="3"
            value={form.observaciones || ""}
            onChange={(e) => onChange("observaciones", e.target.value)}
            placeholder="Notas adicionales..."
          />
        </FieldWrap>

        {/* ── FOTOS — visible al editar y crear ── */}
        <div className="col-span-full space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Fotos de la muestra
            </p>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={photoFileRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handlePhotoFileUpload(e.target.files[0]);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                disabled={uploadingPhoto}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <FiUploadCloud className="h-3.5 w-3.5" /> Subir archivo
              </button>
              <button
                type="button"
                onClick={startCamera}
                disabled={uploadingPhoto || cameraOpen}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B3D8F] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#163272] disabled:opacity-50"
              >
                <FiCamera className="h-3.5 w-3.5" /> Usar cámara
              </button>
            </div>
          </div>

          {/* Grid de fotos subidas (edición) */}
          {editing && editPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {editPhotos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={`${API_ROOT_URL}${p.urlarchivo}`}
                    alt="Muestra"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => deletePhoto(p.id)}
                      className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid de fotos pendientes (creación) */}
          {!editing && pendingPhotos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {pendingPhotos.map((f, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={URL.createObjectURL(f)}
                    alt="Pendiente"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition group-hover:opacity-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePendingPhoto(i)}
                      className="rounded-full bg-white/20 p-2 text-white hover:bg-rose-500 backdrop-blur-sm transition"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur">
                    Por subir
                  </span>
                </div>
              ))}
            </div>
          )}

          {uploadingPhoto && (
            <p className="text-center text-xs font-semibold text-[#1B3D8F] animate-pulse">
              Subiendo foto...
            </p>
          )}

          {/* UI Cámara */}
          {cameraOpen && (
            <CameraCapture 
              videoRef={videoRef}
              canvasRef={canvasRef}
              stopCamera={stopCamera}
              handleCameraCapture={handleCameraCapture}
            />
          )}
        </div>

        <div className="col-span-full flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="ghost-btn"
            onClick={resetAndClose}
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B3D8F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#163272] active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving
              ? "Guardando..."
              : editing
                ? "Guardar cambios"
                : "Crear muestra"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
