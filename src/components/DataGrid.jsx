export const DataGrid = ({
  columns,
  rows,
  onEdit,
  onDelete,
  minWidthClass = "min-w-[760px]",
  containerClassName = "",
}) => {
  return (
    <div
      className={[
        "overflow-auto rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(17,36,74,0.08)]",
        containerClassName,
      ].join(" ")}
    >
      <table className={`${minWidthClass} w-full border-collapse`}>
        <thead>
          <tr className="bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.key}
                className="sticky top-0 border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
              >
                {column.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="sticky top-0 border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                Sin registros
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50/70"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm text-slate-700"
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {onEdit && (
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#1B3D8F] transition hover:-translate-y-0.5 hover:bg-slate-50"
                          onClick={() => onEdit(row)}
                        >
                          Editar
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100"
                          onClick={() => onDelete(row)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
