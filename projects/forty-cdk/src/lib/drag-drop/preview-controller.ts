import { clampPreviewPosition } from '../_internal/drag-session/clamp-preview';
import {
  createDragPreview,
  wrapPreview,
  type DragPreview,
} from '../_internal/drag-session/drag-preview';

/** A viewport point (`clientX` / `clientY`). */
export interface PointerPoint {
  readonly x: number;
  readonly y: number;
}

/** Options handed to {@link PreviewController} at lift time. */
export interface PreviewControllerOptions {
  /** The lifted item's host element (the clone source for the default preview). */
  readonly source: HTMLElement;
  /** The lift-time pointer position, used to seed the grab offset and lock origin. */
  readonly point: PointerPoint;
  /**
   * The floating preview supplied by the draggable (a consumer `[forDragPreview]` template),
   * the minimal `{ moveTo, destroy }` legacy shape, or `null`/`undefined` to let the controller
   * clone the source into the default preview.
   */
  readonly preview?: DragPreview | { moveTo(x: number, y: number): void; destroy(): void } | null;
  /** The owning document (the clone is appended to its body). */
  readonly doc: Document;
  /** The resolved boundary element confining the preview, or `null` for unbounded movement. */
  readonly boundary: HTMLElement | null;
  /** Reactive axis lock read live on every move (`'x'` / `'y'` / `null`). */
  readonly lockAxis: () => 'x' | 'y' | null;
}

/**
 * Owns a single pointer drag's floating preview and the geometry it carries: the grab offset,
 * the measured preview size, the resolved boundary, the axis-lock origin, and the
 * boundary/axis-lock clamp applied on every move.
 *
 * Created at `pointerLift` (one per pointer drag) and disposed via {@link destroy} / {@link settle}
 * at teardown. Collapses what `ForDropList` used to carry as ~6 mutable private fields plus an
 * inline clamp method, and resolves the `DragPreview` discriminator internally (the supplied
 * preview is either already a full `DragPreview` or the minimal `{ moveTo, destroy }` shape).
 *
 * Constructed directly (`new PreviewController(options)`); it holds no injection context. The
 * caller gates construction on a browser platform.
 */
export class PreviewController {
  readonly #preview: DragPreview;
  readonly #grabOffsetX: number;
  readonly #grabOffsetY: number;
  readonly #previewSize: { width: number; height: number };
  readonly #lockOrigin: { x: number; y: number };
  readonly #boundaryEl: HTMLElement | null;
  readonly #lockAxis: () => 'x' | 'y' | null;

  constructor(options: PreviewControllerOptions) {
    const { source, point, preview, doc, boundary, lockAxis } = options;
    const rect = source.getBoundingClientRect();
    this.#grabOffsetX = point.x - rect.left;
    this.#grabOffsetY = point.y - rect.top;
    this.#previewSize = { width: rect.width, height: rect.height };
    this.#lockOrigin = { x: point.x - this.#grabOffsetX, y: point.y - this.#grabOffsetY };
    this.#boundaryEl = boundary;
    this.#lockAxis = lockAxis;
    this.#preview = preview
      ? 'settle' in preview
        ? preview
        : wrapPreview(preview)
      : createDragPreview(source, doc);
    const topLeft = this.clampedTopLeft(point);
    this.#preview.moveTo(topLeft.x, topLeft.y);
  }

  /** Position the preview at the clamped top-left for `point`. */
  moveTo(point: PointerPoint): void {
    const topLeft = this.clampedTopLeft(point);
    this.#preview.moveTo(topLeft.x, topLeft.y);
  }

  /**
   * The boundary/axis-lock-clamped top-left the preview would occupy for `point`. Exposed so the
   * caller can settle the preview into the lifted host's final slot.
   */
  clampedTopLeft(point: PointerPoint): { x: number; y: number } {
    const desired = { x: point.x - this.#grabOffsetX, y: point.y - this.#grabOffsetY };
    const boundaryRect = this.#boundaryEl?.getBoundingClientRect() ?? null;
    return clampPreviewPosition(
      desired,
      this.#previewSize,
      boundaryRect,
      this.#lockAxis(),
      this.#lockOrigin,
    );
  }

  /** The underlying preview, for drop-settle animation handoff. */
  get preview(): DragPreview {
    return this.#preview;
  }

  /** Remove the preview from the DOM. */
  destroy(): void {
    this.#preview.destroy();
  }
}
