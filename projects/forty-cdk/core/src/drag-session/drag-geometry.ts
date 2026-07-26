/** Minimal rectangle shape (structurally satisfied by `DOMRect`). */
export interface DragRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** A drop container's live geometry: its own rect plus the rects of its non-lifted items. */
export interface DropContainerGeometry {
  readonly rect: DragRect;
  /** Item rects in DOM order, EXCLUDING the lifted item. */
  readonly itemRects: readonly DragRect[];
  /**
   * This container's own layout axis — the insertion index is resolved against it. `'mixed'` is
   * 2D resolution for wrapping grids of uniformly-sized items, considering both axes; it reduces
   * to the single-axis result when the items form a single row or a single column.
   */
  readonly orientation: 'horizontal' | 'vertical' | 'mixed';
  /** This container's own resolved writing direction. */
  readonly dir: 'ltr' | 'rtl';
}

/** A resolved pointer drop target: a container plus the insertion index within it. */
export interface DropTarget {
  /** Index into the `[source, ...connected]` container array (0 = source). */
  readonly containerIndex: number;
  /** Insertion index within that container. */
  readonly index: number;
}

function rectContains(rect: DragRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function clampedDistance(rect: DragRect, x: number, y: number): number {
  const cx = Math.max(rect.left, Math.min(rect.right, x));
  const cy = Math.max(rect.top, Math.min(rect.bottom, y));
  return Math.hypot(x - cx, y - cy);
}

function insertionIndex(
  itemRects: readonly DragRect[],
  x: number,
  y: number,
  orientation: 'horizontal' | 'vertical' | 'mixed',
  dir: 'ltr' | 'rtl',
): number {
  if (orientation === 'mixed') {
    return mixedInsertionIndex(itemRects, x, y, dir);
  }
  for (let i = 0; i < itemRects.length; i++) {
    const r = itemRects[i]!;
    const past =
      orientation === 'vertical'
        ? y < (r.top + r.bottom) / 2
        : dir === 'rtl'
          ? x > (r.left + r.right) / 2
          : x < (r.left + r.right) / 2;
    if (past) {
      return i;
    }
  }
  return itemRects.length;
}

function mixedInsertionIndex(
  itemRects: readonly DragRect[],
  x: number,
  y: number,
  dir: 'ltr' | 'rtl',
): number {
  if (isSingleRow(itemRects)) {
    return insertionIndex(itemRects, x, y, 'horizontal', dir);
  }
  if (isSingleColumn(itemRects)) {
    return insertionIndex(itemRects, x, y, 'vertical', dir);
  }
  for (let i = 0; i < itemRects.length; i++) {
    const r = itemRects[i]!;
    const beforeRow = y < r.top;
    const withinRow = y <= r.bottom;
    const pastColumn = dir === 'rtl' ? x > (r.left + r.right) / 2 : x < (r.left + r.right) / 2;
    if (beforeRow || (withinRow && pastColumn)) {
      return i;
    }
  }
  return itemRects.length;
}

function isSingleRow(itemRects: readonly DragRect[]): boolean {
  let maxTop = -Infinity;
  let minBottom = Infinity;
  for (const r of itemRects) {
    maxTop = Math.max(maxTop, r.top);
    minBottom = Math.min(minBottom, r.bottom);
  }
  return maxTop < minBottom;
}

function isSingleColumn(itemRects: readonly DragRect[]): boolean {
  let maxLeft = -Infinity;
  let minRight = Infinity;
  for (const r of itemRects) {
    maxLeft = Math.max(maxLeft, r.left);
    minRight = Math.min(minRight, r.right);
  }
  return maxLeft < minRight;
}

/**
 * Resolves the drop target container and insertion index from a pointer position.
 *
 * Each container carries its own `orientation` / `dir`, and the insertion index is resolved
 * against the axis of the container that won the selection — so a transfer into a connected
 * container whose orientation or writing direction differs from the source's resolves the index
 * on the TARGET's axis.
 *
 * @param point Viewport pointer coordinates.
 * @param containers Ordered `[source, ...connected]` container geometries.
 * @returns The resolved `DropTarget`, or `null` when `containers` is empty.
 */
export function resolveDropTarget(
  point: { readonly x: number; readonly y: number },
  containers: readonly DropContainerGeometry[],
): DropTarget | null {
  if (containers.length === 0) {
    return null;
  }

  let containerIndex = -1;

  for (let i = 0; i < containers.length; i++) {
    if (rectContains(containers[i]!.rect, point.x, point.y)) {
      containerIndex = i;
      break;
    }
  }

  if (containerIndex < 0) {
    let minDist = Infinity;
    for (let i = 0; i < containers.length; i++) {
      const d = clampedDistance(containers[i]!.rect, point.x, point.y);
      if (d < minDist) {
        minDist = d;
        containerIndex = i;
      }
    }
  }

  const container = containers[containerIndex]!;
  const index = insertionIndex(
    container.itemRects,
    point.x,
    point.y,
    container.orientation,
    container.dir,
  );

  return { containerIndex, index };
}
