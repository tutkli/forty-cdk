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
  orientation: 'horizontal' | 'vertical',
  dir: 'ltr' | 'rtl',
): number {
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

/**
 * Resolves the drop target container and insertion index from a pointer position.
 *
 * @param point Viewport pointer coordinates.
 * @param containers Ordered `[source, ...connected]` container geometries.
 * @param orientation List axis — `'horizontal'` or `'vertical'`.
 * @param dir Writing direction for horizontal insertion-index math.
 * @returns The resolved `DropTarget`, or `null` when `containers` is empty.
 */
export function resolveDropTarget(
  point: { readonly x: number; readonly y: number },
  containers: readonly DropContainerGeometry[],
  orientation: 'horizontal' | 'vertical',
  dir: 'ltr' | 'rtl',
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
  const index = insertionIndex(container.itemRects, point.x, point.y, orientation, dir);

  return { containerIndex, index };
}
