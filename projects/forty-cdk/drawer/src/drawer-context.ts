import { inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';
import { type ForDrawerSide } from 'forty-cdk/core-overlay';

export { type ForDrawerSide };

/**
 * A snap point. Three accepted shapes:
 *
 * - `number ∈ [0, 1]` — fraction of the dimension along the dismissal axis.
 * - `'NN%'` — equivalent to a fraction, e.g. `'50%' === 0.5`.
 * - `'NNpx'` — absolute pixel size measured from the anchored edge.
 */
export type ForDrawerSnapPoint = number | `${number}%` | `${number}px`;

/**
 * Reasons emitted via the `(dismiss)` output. A single drawer instance can
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
  /**
   * `true` while a pointer drag gesture is in flight. Mirrors the host's
   * `data-dragging` attribute so pieces portaled away from the surface
   * (the backdrop) can suppress their own transitions during the gesture.
   */
  readonly dragging: Signal<boolean>;
  /**
   * Progress of the current swipe *toward the anchored edge* (dismiss
   * direction), as a fraction `∈ [0, 1]` of the drawer's dimension along
   * the dismissal axis. `0` at rest and while growing away from the edge
   * (with snap points). The backdrop publishes this as the
   * `--for-drawer-swipe-progress` custom property so consumers can fade it
   * out as the surface is swiped off-screen — `opacity: calc(1 - var(--for-drawer-swipe-progress))`.
   */
  readonly swipeProgress: Signal<number>;
  readonly labelledBy: Signal<string | null>;
  readonly describedBy: Signal<string | null>;
  /**
   * Portal target shared with the backdrop so both resolve the same
   * container. `null` ⇒ `document.body`. Set via the drawer's `container`
   * input; read once per mount.
   */
  readonly container: Signal<HTMLElement | null>;

  /**
   * Host element of the drawer surface. Exposed so a nested child can
   * register its parent topology with `ForDrawerStack` without piercing
   * Angular DI to fetch the parent's `ElementRef`. Read-only — pieces
   * never mutate the host directly.
   */
  readonly hostElement: HTMLElement;

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
   * Register the backdrop element so the dismissible layer treats it as
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

/**
 * @internal Per-instance drawer id, provided by `ForDrawerManager` into the
 * opened component's injector so the portaled `[forDrawerBackdrop]` can
 * reflect `data-for-drawer-id` and be paired with its drawer for the
 * manager's exit-animation orchestration. Absent in the declarative path,
 * where the backdrop's own `animate.leave` runs normally.
 */
export const FOR_DRAWER_INSTANCE_ID = new InjectionToken<string>('FOR_DRAWER_INSTANCE_ID');

export function injectDrawerContext(piece: string): ForDrawerContext {
  const ctx = inject(FOR_DRAWER_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-DRAWER-002',
      piece,
      root: '[forDrawer]',
      token: 'FOR_DRAWER_CONTEXT',
    });
  }
  return ctx;
}

/**
 * Swipe gesture payloads. `ForDrawerSwipeEvent` is surfaced through
 * `(swipeStart)` / `(swipeMove)` / `(swipeCancel)`; `ForDrawerSwipeEndEvent`
 * through `(swipeEnd)`. They let consumers drive bespoke visualizations
 * (e.g. a separate "scaled background" effect, a debug HUD); the directive
 * itself owns transform application and snap resolution.
 */
export interface ForDrawerSwipeEvent {
  /**
   * Progress of the gesture toward the anchored edge (dismiss direction), a
   * unitless fraction `∈ [0, 1]` of the drawer's dimension along the
   * dismissal axis. `0` on arm and while growing away from the edge (with
   * snap points).
   */
  readonly progress: number;
  readonly originalEvent: PointerEvent;
}

export interface ForDrawerSwipeEndEvent {
  readonly willClose: boolean;
  readonly nextSnapPoint: ForDrawerSnapPoint | null;
  readonly originalEvent: PointerEvent;
}
