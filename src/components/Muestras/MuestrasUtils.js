export const ESTADO_META = {
  nueva: { label: "Nueva", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "no presentado": {
    label: "No presentado",
    cls: "bg-slate-50 text-slate-600 border-slate-200",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-orange-50 text-orange-700 border-orange-200",
  },
  presentada: {
    label: "Presentada",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
  },
  aprobada: {
    label: "Aprobada",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rechazada: {
    label: "Rechazada",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  },
  reutilizable: {
    label: "Reutilizable",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  "dada de baja": {
    label: "Dada de baja",
    cls: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

export const emptyForm = {
  referencia: "",
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

export const safe = (val) => {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object")
    return val.nombre ?? val.label ?? JSON.stringify(val);
  return String(val) || "—";
};

export const esMuestraVariacion = (row) => {
  if (!row) return false;
  if (row.variacion === true) return true;
  return (
    String(row.estado || "")
      .trim()
      .toLowerCase() === "variacion"
  );
};

export const formatearReferenciaVariacion = (row) => {
  if (!row) return "—";

  const referencia = String(row.referencia || "").trim();
  if (referencia) return referencia;

  const base = String(row.muestraOriginal?.referencia || "").trim();
  const numero = String(row.orden || "").trim();
  if (base && numero) {
    return `${base} ${numero}`;
  }

  return "—";
};

export const toCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
};
