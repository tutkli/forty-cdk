/** One visible tree row as the resolver sees it. Rects in viewport coords. */
export interface TreeDropRow<T = unknown> {
  /** The node's value. */
  readonly value: T;
  /** 1-based depth. */
  readonly level: number;
  /** rect.left — used to map levels to x. */
  readonly left: number;
  readonly top: number;
  readonly bottom: number;
}

/** Where a lifted node will land, for rendering an insertion indicator. */
export interface TreeDropIndicator<T = unknown> {
  /** The visible row the indicator anchors to (the node value). */
  readonly anchor: T;
  /** Whether the line sits just before or just after the anchor row in DOM order. */
  readonly position: 'before' | 'after';
  /** Resolved 1-based depth of the drop. */
  readonly level: number;
}

/** A resolved tree drop position. */
export interface TreeDropTarget<T = unknown> {
  /** New parent's value, or `null` for the root level. */
  readonly parentValue: T | null;
  /** Insertion index among the new parent's children (post-removal space). */
  readonly index: number;
  /** Resolved 1-based depth of the dropped node. */
  readonly level: number;
  /**
   * Number of existing children under `parentValue` at the resolved `level` (excluding the
   * dragged node, which is absent from `rows`). The dropped node will be sibling
   * `index + 1` of `siblingCount + 1` after the move — the numbers screen-reader
   * announcements report.
   */
  readonly siblingCount: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Resolves a tree drop from a flattened, DOM-ordered list of the currently visible rows
 * (EXCLUDING the dragged node, whose subtree is collapsed during the drag).
 *
 * @param rows Visible rows in DOM order, dragged node excluded.
 * @param gapIndex Insertion gap: the row index the dropped node would sit *before* (`rows.length`
 *   = after the last row). For pointer, derive this from the vertical midpoint rule; for keyboard,
 *   it is the running target the arrows step.
 * @param desiredLevel Caller's desired depth (pointer: nearest level to the pointer x; keyboard:
 *   the running level the Left/Right arrows adjust). Clamped to the gap's allowed band.
 */
export function resolveTreeDrop<T>(
  rows: readonly TreeDropRow<T>[],
  gapIndex: number,
  desiredLevel: number,
): TreeDropTarget<T> {
  if (rows.length === 0) {
    return { parentValue: null, index: 0, level: 1, siblingCount: 0 };
  }

  const gap = clamp(gapIndex, 0, rows.length);
  const prev = gap > 0 ? (rows[gap - 1] ?? null) : null;
  const next = gap < rows.length ? (rows[gap] ?? null) : null;

  const maxLevel = prev ? prev.level + 1 : 1;
  let minLevel = next ? next.level : 1;
  if (minLevel > maxLevel) {
    minLevel = maxLevel;
  }

  const level = clamp(desiredLevel, minLevel, maxLevel);

  let parentValue: T | null = null;
  if (level > 1) {
    for (let i = gap - 1; i >= 0; i--) {
      if (rows[i]!.level === level - 1) {
        parentValue = rows[i]!.value;
        break;
      }
    }
  }

  let index = 0;
  let siblingCount = 0;
  for (let i = 0; i < rows.length; i++) {
    if (!isSiblingUnder(rows, i, level, parentValue)) {
      continue;
    }
    siblingCount++;
    if (i < gap) {
      index++;
    }
  }

  return { parentValue, index, level, siblingCount };
}

/**
 * Whether the row at `rowIndex` is a child of `parentValue` at depth `level` — i.e. it sits
 * at `level` and its nearest preceding row at `level - 1` is `parentValue` (root rows at
 * `level === 1` have no ancestor row, so they always qualify when their depth matches).
 */
function isSiblingUnder<T>(
  rows: readonly TreeDropRow<T>[],
  rowIndex: number,
  level: number,
  parentValue: T | null,
): boolean {
  const row = rows[rowIndex]!;
  if (row.level !== level) {
    return false;
  }
  if (level === 1) {
    return true;
  }
  for (let j = rowIndex - 1; j >= 0; j--) {
    if (rows[j]!.level === level - 1) {
      return rows[j]!.value === parentValue;
    }
  }
  return parentValue === null;
}

/**
 * Maps a pointer y coordinate to the insertion gap among `rows` using the vertical-midpoint
 * rule: the gap is the index of the first row whose vertical midpoint sits below `y`
 * (`rows.length` when `y` is below every row's midpoint).
 *
 * @param rows Visible rows in DOM order, dragged node excluded.
 * @param y Pointer y in viewport coordinates.
 */
export function gapFromPointerY(rows: readonly TreeDropRow<unknown>[], y: number): number {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const mid = (row.top + row.bottom) / 2;
    if (y < mid) {
      return i;
    }
  }
  return rows.length;
}

/**
 * Resolves the insertion-indicator anchor for a gap: the line sits `before` the row at
 * `gapIndex`, or `after` the last row when the gap is past the end. Returns `null` when there
 * are no rows to anchor to.
 *
 * @param rows Visible rows in DOM order, dragged node excluded.
 * @param gapIndex Insertion gap (same as passed to {@link resolveTreeDrop}).
 * @param level Resolved 1-based depth to report on the indicator.
 */
export function resolveDropIndicator<T>(
  rows: readonly TreeDropRow<T>[],
  gapIndex: number,
  level: number,
): TreeDropIndicator<T> | null {
  if (rows.length === 0) {
    return null;
  }
  const gap = clamp(gapIndex, 0, rows.length);
  if (gap >= rows.length) {
    return { anchor: rows[rows.length - 1]!.value, position: 'after', level };
  }
  return { anchor: rows[gap]!.value, position: 'before', level };
}

/**
 * Maps a pointer x coordinate to the nearest candidate level within the allowed band
 * at `gapIndex`. Uses each level's representative left (minimum left observed among rows
 * at that level) and falls back to linear interpolation when a level isn't present.
 *
 * @param rows Visible rows in DOM order, dragged node excluded.
 * @param gapIndex Gap index (same as passed to `resolveTreeDrop`).
 * @param x Pointer x in viewport coordinates.
 */
export function levelFromPointerX(
  rows: readonly TreeDropRow<unknown>[],
  gapIndex: number,
  x: number,
): number {
  if (rows.length === 0) {
    return 1;
  }

  const next = gapIndex < rows.length ? (rows[gapIndex] ?? null) : null;
  const minLevel = next ? next.level : 1;

  const levelLefts = new Map<number, number>();
  for (const row of rows) {
    const existing = levelLefts.get(row.level);
    if (existing === undefined || row.left < existing) {
      levelLefts.set(row.level, row.left);
    }
  }

  const candidateLevels = Array.from(levelLefts.keys()).sort((a, b) => a - b);

  if (candidateLevels.length === 0) {
    return minLevel;
  }

  let bestLevel = candidateLevels[0]!;
  let bestDist = Infinity;
  for (const lvl of candidateLevels) {
    const lx = levelLefts.get(lvl)!;
    const dist = Math.abs(x - lx);
    if (dist < bestDist) {
      bestDist = dist;
      bestLevel = lvl;
    }
  }

  return bestLevel;
}
