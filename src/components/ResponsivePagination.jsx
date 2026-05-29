import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";

const baseButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-xl border px-2 text-xs font-semibold transition focus:outline-none focus-visible:outline-none sm:h-10 sm:min-w-10 sm:px-3 sm:text-sm";

export const ResponsivePagination = ({
  pageLabel = "Page",
  resultsLabel = "Results",
  showSummary = true,
  page,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  buttons,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onPage,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="overflow-x-hidden border-t border-slate-100 px-3 py-4 text-sm sm:px-5">
      <div className="flex min-w-0 w-full flex-col items-center gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 w-full flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center md:justify-start">
          <span className="text-center text-slate-500 sm:text-left">{pageLabel}</span>

          <div className="flex min-w-0 w-full max-w-full flex-wrap items-center justify-center gap-1.5 overflow-hidden sm:w-auto">
            <button
              type="button"
              className={`${baseButtonClass} border-slate-200 bg-white text-[#1B3D8F] sm:px-3`}
              disabled={page <= 1}
              onClick={onFirst}
              title="Primera"
              aria-label="Primera página"
            >
              <FiChevronsLeft />
            </button>

            <button
              type="button"
              className={`${baseButtonClass} border-slate-200 bg-white text-[#1B3D8F] sm:px-3`}
              disabled={page <= 1}
              onClick={onPrev}
              title="Anterior"
              aria-label="Página anterior"
            >
              <FiChevronLeft />
            </button>

            <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-1">
              {buttons.map((item) => {
                if (typeof item === "string") {
                  return (
                    <span key={item} className="px-1 text-slate-400" aria-hidden="true">
                      …
                    </span>
                  );
                }

                const isActive = item === page;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPage(item)}
                    className={
                      isActive
                        ? `${baseButtonClass} border-[#1B3D8F] bg-[#1B3D8F] px-2.5 text-white sm:px-3`
                        : `${baseButtonClass} border-slate-200 bg-white px-2.5 text-slate-700 hover:bg-slate-50 sm:px-3`
                    }
                    aria-current={isActive ? "page" : undefined}
                    aria-label={`Página ${item}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={`${baseButtonClass} border-slate-200 bg-white text-[#1B3D8F] sm:px-3`}
              disabled={page >= totalPages}
              onClick={onNext}
              title="Siguiente"
              aria-label="Página siguiente"
            >
              <FiChevronRight />
            </button>

            <button
              type="button"
              className={`${baseButtonClass} border-slate-200 bg-white text-[#1B3D8F] sm:px-3`}
              disabled={page >= totalPages}
              onClick={onLast}
              title="Ultima"
              aria-label="Última página"
            >
              <FiChevronsRight />
            </button>
          </div>
        </div>

        {showSummary ? (
          <span className="w-full text-center text-slate-500 md:w-auto md:text-right">
            {resultsLabel} {startIndex} to {endIndex} of {totalItems}
          </span>
        ) : null}
      </div>
    </div>
  );
};