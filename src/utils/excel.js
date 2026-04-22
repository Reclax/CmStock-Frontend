import * as XLSX from "xlsx";

export const exportToExcel = (rows, fileName, sheetName = "Datos") => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const readExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(worksheet, { defval: "" });
};

export const IMPORT_TEMPLATE_COLUMNS = [
  "ORDEN Nº",
  "MES",
  "REF",
  "PARES",
  "MARCA",
  "MOLDERIA",
  "MOLDERIA NUEVA",
  "SEGMENTO",
  "LICENCIA",
  "DIMA",
  "TALLA",
  "CLIENTE",
  "DISEÑADOR",
  "DIFICULTAD",
  "TIEMPOS",
  "APROBACION",
  "FECHAS",
  "PROCESO",
  "OBSERVACIONES",
];

export const downloadTemplate = () => {
  const templateRow = Object.fromEntries(
    IMPORT_TEMPLATE_COLUMNS.map((key) => [key, ""]),
  );
  exportToExcel([templateRow], "plantilla_importacion_cmstock", "Plantilla");
};
