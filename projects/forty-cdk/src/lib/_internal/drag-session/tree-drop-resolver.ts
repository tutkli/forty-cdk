/** One visible tree row as the resolver sees it. Rects in viewport coords. */
export interface TreeDropRow {
  /** The node's string value. */
  readonly value: string;
  /** 1-based depth. */
  readonly level: number;
  /** rect.left — used to map levels to x. */
  readonly left: number;
  readonly top: number;
  readonly bottom: number;
}

/** A resolved tree drop position. */
export interface TreeDropTarget {
  /** New parent's value, or `null` for the root level. */
  readonly parentValue: string | null;
  /** Insertion index among the new parent's children (post-removal space). */
  readonly index: number;
  /** Resolved 1-based depth of the dropped node. */
  readonly level: number;
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
export function resolveTreeDrop(
  rows: readonly TreeDropRow[],
  gapIndex: number,
  desiredLevel: number,
): TreeDropTarget {
  if (rows.length === 0) {
    return { parentValue: null, index: 0, level: 1 };
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

  let parentValue: string | null = null;
  if (level > 1) {
    for (let i = gap - 1; i >= 0; i--) {
      if (rows[i]!.level === level - 1) {
        parentValue = rows[i]!.value;
        break;
      }
    }
  }

  let index = 0;
  for (let i = 0; i < gap; i++) {
    const row = rows[i]!;
    if (row.level !== level) {
      continue;
    }
    if (level === 1) {
      index++;
    } else {
      let ancestor: string | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (rows[j]!.level === level - 1) {
          ancestor = rows[j]!.value;
          break;
        }
      }
      if (ancestor === parentValue) {
        index++;
      }
    }
  }

  return { parentValue, index, level };
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
  rows: readonly TreeDropRow[],
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
