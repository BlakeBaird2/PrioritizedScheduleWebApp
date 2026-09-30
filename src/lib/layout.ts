/**
 * Side-by-side placement for things that overlap on a time grid, the way every
 * calendar app does it: overlapping items share the width, each in its own column.
 */
export interface Placed<T> {
  item: T;
  /** 0-based column. */
  col: number;
  /** Columns in this item's overlapping group. */
  cols: number;
}

export function layoutColumns<T>(items: T[], start: (t: T) => number, end: (t: T) => number): Placed<T>[] {
  const sorted = [...items].sort((a, b) => start(a) - start(b) || end(b) - end(a));
  const out: Placed<T>[] = [];
  let group: Placed<T>[] = [];
  let groupEnd = -Infinity;
  let colEnds: number[] = [];

  const flush = () => {
    for (const p of group) p.cols = colEnds.length;
    out.push(...group);
    group = [];
    colEnds = [];
    groupEnd = -Infinity;
  };

  for (const item of sorted) {
    const s = start(item);
    const e = Math.max(end(item), s + 1);
    if (group.length && s >= groupEnd) flush();
    let col = colEnds.findIndex((ce) => ce <= s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(e);
    } else colEnds[col] = e;
    group.push({ item, col, cols: 0 });
    groupEnd = Math.max(groupEnd, e);
  }
  flush();
  return out;
}
