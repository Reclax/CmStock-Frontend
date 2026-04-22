export const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

export const toNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const boolLabel = (value) => (value ? "Si" : "No");

export const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-EC");
};
