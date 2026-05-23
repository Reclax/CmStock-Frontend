import { ESTADO_META } from "./MuestrasUtils";

export const EstadoBadge = ({ estado }) => {
  const meta = ESTADO_META[estado?.toLowerCase()] ?? {
    label: estado || "—",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

export const FieldWrap = ({ label, children, full = false }) => (
  <label className={`flex flex-col gap-1.5 ${full ? "col-span-full" : ""}`}>
    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

export const StatChip = ({ label, value, accent }) => (
  <div
    className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold backdrop-blur ${accent ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/8 text-white/80"}`}
  >
    <span className="text-white/60 text-xs font-medium">{label}</span>
    <span className="font-black text-white">{value}</span>
  </div>
);

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1B3D8F] focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,61,143,0.08)] placeholder:text-slate-400";

export const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#1B3D8F" : "#e2e8f0",
    backgroundColor: "#f8fafc",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(27,61,143,0.08)" : "none",
    paddingLeft: "0.25rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.5rem" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  menuPortal: (base) => ({ ...base, zIndex: 60 }),
  menu: (base) => ({ ...base, zIndex: 60 }),
};
