export const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export const parseDateValue = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const boolLabel = (value) => (value ? "Si" : "No");

export const formatDate = (value) => {
  if (!value) return "-";
  const parsed = parseDateValue(value);
  return parsed ? parsed.toLocaleDateString("es-EC") : "-";
};
