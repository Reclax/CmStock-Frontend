export const buildPagination = ({
  page,
  totalPages,
  maxButtons = 6,
}) => {
  const safeTotal = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotal);

  const buttons = [];

  // Always show first page
  buttons.push(1);

  if (safeTotal === 1) {
    return { safePage, safeTotal, buttons };
  }

  const windowSize = Math.max(0, maxButtons - 2); // minus first/last
  const half = Math.floor(windowSize / 2);

  let start = safePage - half;
  let end = safePage + half;

  if (windowSize % 2 === 0) {
    end -= 1;
  }

  start = Math.max(2, start);
  end = Math.min(safeTotal - 1, end);

  // Rebalance window to keep count
  while (end - start + 1 < windowSize) {
    if (start > 2) start -= 1;
    else if (end < safeTotal - 1) end += 1;
    else break;
  }

  if (start > 2) buttons.push("ellipsis-left");

  for (let p = start; p <= end; p += 1) {
    buttons.push(p);
  }

  if (end < safeTotal - 1) buttons.push("ellipsis-right");

  // Always show last page
  buttons.push(safeTotal);

  return { safePage, safeTotal, buttons };
};
