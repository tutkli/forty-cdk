import { type DragRect } from './drag-geometry';

/** A point in viewport coordinates (the preview's top-left). */
export interface PreviewPoint {
  readonly x: number;
  readonly y: number;
}

/** The preview box's measured size. */
export interface PreviewSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Constrains a drag preview's desired top-left position.
 *
 * Applies, in order:
 * - **axis lock** — when `lockAxis` is `'x'` the preview moves along the x axis only, so its
 *   `y` is held at `origin.y`; when `'y'` it moves along the y axis only, so its `x` is held at
 *   `origin.x`; `null` leaves both free.
 * - **boundary clamp** — when `boundary` is non-null, the resulting top-left is clamped so the
 *   preview box (`size`) stays fully inside the boundary rect. When the boundary is smaller than
 *   the preview on an axis, the preview is pinned to the boundary's start edge on that axis.
 *
 * Pure: takes already-measured rects/sizes, performs no DOM reads. `origin` is the preview's
 * desired top-left at lift time (the axis-lock anchor).
 */
export function clampPreviewPosition(
  desired: PreviewPoint,
  size: PreviewSize,
  boundary: DragRect | null,
  lockAxis: 'x' | 'y' | null,
  origin: PreviewPoint,
): PreviewPoint {
  let x = lockAxis === 'y' ? origin.x : desired.x;
  let y = lockAxis === 'x' ? origin.y : desired.y;
  if (boundary) {
    x = Math.max(boundary.left, Math.min(x, boundary.right - size.width));
    y = Math.max(boundary.top, Math.min(y, boundary.bottom - size.height));
  }
  return { x, y };
}
