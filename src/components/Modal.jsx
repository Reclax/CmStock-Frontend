export const Modal = ({ title, onClose, children }) => {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92vh] w-full max-w-[920px] overflow-auto rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(17,36,74,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1B3D8F] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
};
