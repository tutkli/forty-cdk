import { inject, InjectionToken, type Signal } from '@angular/core';

/**
 * Edge from which the drawer enters the viewport. The active snap-point
 * dimension (height for top/bottom, width for left/right) is laid out
 * along the axis perpendicular to this edge.
 */
export type ForDrawerSide = 'top' | 'right' | 'bottom' | 'left';

/**
 * A snap point. Three accepted shapes (Vaul-aligned):
 *
 * - `number ∈ [0, 1]` — fraction of the dimension along the dismissal axis.
 * - `'NN%'` — equivalent to a fraction, e.g. `'50%' === 0.5`.
 * - `'NNpx'` — absolute pixel size measured from the anchored edge.
 */
export type ForDrawerSnapPoint = number | `${number}%` | `${number}px`;

/**
 * Reasons emitted via the `(close)` output. A single drawer instance can
 * cycle through any of these — the consumer typically just flips its
 * `@if`-gating signal off, but may choose to skip the unmount on specific
 * reasons (e.g. ignore `'pointerDownOutside'` for a sticky drawer).
 */
export type ForDrawerCloseReason =
  | 'escape'
  | 'backdrop'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'closeButton'
  | 'swipe'
  | 'programmatic';

/**
 * Coordination contract owned by `ForDrawer` (declarative) or by the
 * `ForDrawerManager.open()` machinery (programmatic). Title / Description
 * register their generated ids so the drawer wires `aria-labelledby` /
 * `aria-describedby` reactively. Backdrop, Close button and Handle hook
 * into the same surface to request close / register themselves.
 *
 * The drawer's "openness" isn't part of this contract: the directive is
 * mounted iff the drawer is open, so descendants don't need an open
 * signal to coordinate.
 */
export interface ForDrawerContext {
  readonly dismissible: Signal<boolean>;
  readonly modal: Signal<boolean>;
  readonly alert: Signal<boolean>;
  readonly side: Signal<ForDrawerSide>;
  readonly activeSnapPoint: Signal<ForDrawerSnapPoint | null>;
  /**
   * Whether the backdrop should reflect `data-fade-from-active`. True
   * when `fadeFromIndex` is set and the active snap point is at or past
   * that index. Computed by the root.
   */
  readonly fadeFromActive: Signal<boolean>;
  readonly labelledBy: Signal<string | null>;
  readonly describedBy: Signal<string | null>;

  registerLabel(id: string): void;
  unregisterLabel(id: string): void;
  registerDescription(id: string): void;
  unregisterDescription(id: string): void;

  /**
   * Register the visual handle element so that `handleOnly === true`
   * gates the swipe gesture to gestures starting on this element. Pass
   * `null` to unregister.
   */
  registerHandle(el: HTMLElement | null): void;

  /**
   * Register the backdrop element so the dismissable layer treats it as
   * part of the drawer surface (`exemptElements`) — without this, a
   * `pointerdown` on the portaled backdrop would fire `pointerDownOutside`
   * before the backdrop's `click` handler runs, so the consumer would see
   * close-reason `'pointerDownOutside'` instead of `'backdrop'` (WebKit
   * was the first to surface this; Chromium happened to dispatch the
   * events in an order that masked it). Pass `null` to unregister.
   */
  registerBackdrop(el: HTMLElement | null): void;

  /**
   * Request that the drawer close. Reasons:
   * - `'escape'` / `'backdrop'` / `'pointerDownOutside'` / `'focusOutside'` /
   *   `'swipe'`: honored only when `dismissible()` is true.
   * - `'closeButton'`: always honored.
   * - `'programmatic'`: always honored, used by `ForDrawerManager.open()`
   *   consumers that drive close imperatively from a child component.
   *
   * `value` is the close result, propagated to `ForDrawerRef.close(value)`
   * in programmatic mode. Ignored in declarative mode.
   */
  requestClose(reason: ForDrawerCloseReason, value?: unknown): void;
}

export const FOR_DRAWER_CONTEXT = new InjectionToken<ForDrawerContext>('FOR_DRAWER_CONTEXT');

export function injectDrawerContext(piece: string): ForDrawerContext {
  const ctx = inject(FOR_DRAWER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/drawer] ${piece} must be used inside a [forDrawer] element.`);
  }
  return ctx;
}

/**
 * Drag/release event payloads. Surfaced through `(drag)` / `(release)`
 * so consumers can drive bespoke visualizations (e.g. a separate "scaled
 * background" effect, a debug HUD); the directive itself owns transform
 * application and snap resolution.
 */
export interface ForDrawerDragEvent {
  readonly percentageDragged: number;
  readonly originalEvent: PointerEvent;
}

export interface ForDrawerReleaseEvent {
  readonly willClose: boolean;
  readonly nextSnapPoint: ForDrawerSnapPoint | null;
  readonly originalEvent: PointerEvent;
}
