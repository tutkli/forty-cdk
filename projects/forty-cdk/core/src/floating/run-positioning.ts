import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  type Signal,
} from '@angular/core';
import {
  autoUpdate,
  computePosition,
  type ComputePositionReturn,
  type Middleware,
  type Placement,
  type ReferenceElement,
} from '@floating-ui/dom';

import { injectPortal } from '../portal/portal';

/**
 * The positioner-specific work for a single open run, returned by
 * {@link PositioningConfig.computeAndApply}. The shared scaffold owns the
 * platform gate, portal, anti-flash baseline, `autoUpdate` loop, the
 * `!open()` / cancelled-run bail, the `translate` write, the `clip-path` drop,
 * the per-open {@link PositioningConfig.onFirstPosition} dispatch, and the
 * `.catch(() => {})`; a run supplies only the parts that genuinely differ
 * between positioners.
 */
export interface PositioningRun {
  /**
   * The requested placement handed to `@floating-ui/dom`'s `computePosition`.
   * (The strategy is always `'fixed'`, owned by the scaffold.)
   */
  readonly placement: Placement;

  /** The middleware stack handed to `computePosition` for this run. */
  readonly middleware: Middleware[];

  /**
   * Applies a resolved position. Runs on every `autoUpdate` frame, after the
   * scaffold has bailed on a mid-frame close, written the resolved `translate`,
   * and dropped the `clip-path` anti-flash baseline. Writes the positioner's
   * own `data-*` attributes and CSS variables (and, for the anchored
   * positioner, the arrow).
   */
  apply(result: ComputePositionReturn): void;

  /**
   * Resets everything the run wrote, invoked from the effect's `onCleanup`
   * when `open` flips back to `false`, the config changes while open, or the
   * host is destroyed. What is reset (and what is intentionally retained for
   * `animate.leave`) is the positioner's decision.
   */
  reset(): void;
}

/**
 * Configuration for {@link runPositioning}. Mirrors the shared shape of the
 * two positioners (`injectFloating`, `injectItemAlignedPositioner`) — the
 * reactive `reference` / `open`, the optional `portal` and anti-flash toggle —
 * and defers the positioner-specific compute + apply + reset to
 * {@link computeAndApply}.
 */
export interface PositioningConfig {
  /**
   * The anchor. Reactive — should emit `null` until the anchor is available;
   * positioning is skipped while `null` or `open` is `false`.
   */
  readonly reference: Signal<ReferenceElement | null>;

  /**
   * Whether the floating element is currently visible. `autoUpdate` is started
   * when this becomes `true` and torn down when it goes back to `false`.
   */
  readonly open: Signal<boolean>;

  /**
   * When `true` (default), the floating element is moved to `document.body` on
   * first render and removed on destroy. Set to `false` to keep it in its
   * declared parent (or when the caller already invokes `injectPortal()`).
   */
  readonly portal?: boolean;

  /**
   * When the signal returns anything other than `false` (the default when the
   * signal is omitted), the surface is clipped with `clip-path: inset(50%)`
   * until the first position resolves, so a CSS enter animation never flashes
   * at the viewport corner before the async `computePosition` lands.
   */
  readonly clipUntilPositioned?: Signal<boolean>;

  /**
   * Invoked once per **open cycle**, immediately after the first
   * `computePosition` of that cycle resolves and its `run.apply` has run —
   * i.e. after the portal move, after the `clip-path` anti-flash baseline is
   * dropped, and after the positioner has written its `data-*` / CSS vars.
   *
   * The semantics are deliberately **per-open, not per-run**: a positioner
   * config change while the surface stays open re-runs the effect (a new
   * positioning run), but this hook does **not** fire again — it fires only on
   * the run that first resolves after `open` transitions to `true`. A run that
   * is superseded (config change while open) or torn down (close / destroy)
   * before its `computePosition` resolves is cancelled: its resolution writes
   * nothing and never fires this hook. This matters because consumers use it to
   * seed one-shot state that a re-fire would corrupt — e.g. scrolling an active
   * option into view inside a freshly portaled listbox, which a per-run re-fire
   * would yank back mid-interaction on every side flip.
   */
  readonly onFirstPosition?: () => void;

  /**
   * Builds the per-run controller. Called once per open run, synchronously
   * inside the positioning effect, so its reactive reads (side, align,
   * offsets, selected option, …) register as effect dependencies and a change
   * while open re-runs the effect. Receives the floating element and the
   * resolved (non-null) reference.
   */
  readonly computeAndApply: (el: HTMLElement, reference: ReferenceElement) => PositioningRun;
}

/**
 * Shared scaffold behind the library's two `@floating-ui/dom` positioners —
 * `injectFloating` (the general anchored positioner) and
 * `injectItemAlignedPositioner` (the macOS-style over-trigger positioner for
 * `[forSelectContent]`). Must be called from an injection context. Pulls the
 * `ElementRef` it lives on as the floating element and owns everything the two
 * positioners had independently reimplemented:
 *
 * 1. The `isPlatformBrowser` gate — `effect()` runs server-side even though
 *    `afterNextRender` gates on `ngServerMode`, so the guard has to be explicit
 *    to keep SSR from setting up a portal / positioning effect.
 * 2. The optional portal — `appendChild` to `document.body` once mounted,
 *    `remove()` on `DestroyRef.onDestroy`.
 * 3. The `clip-path: inset(50%)` anti-flash baseline, armed on mount in
 *    `afterNextRender` and re-armed at the start of every open effect run (a
 *    config change while open re-runs the effect and `onCleanup` clears the
 *    baseline, so re-arming keeps the surface hidden at the retained stale
 *    position until the async `computePosition` resolves).
 * 4. A reactive effect that reads `open` / `reference` first and early-returns
 *    while closed — so a closed overlay only tracks `open` / `reference` and
 *    never re-runs on an offset/side change — then delegates to
 *    {@link PositioningConfig.computeAndApply} and drives `autoUpdate`.
 * 5. Inside each `autoUpdate` frame: the `!open()` / cancelled-run bail (the
 *    surface may have closed, or this run may have been superseded by a config
 *    change, between schedule and resolution), the `translate` write, the
 *    `clip-path` drop, the per-open `onFirstPosition` dispatch, and the
 *    `.catch(() => {})` that swallows the rejection when the reference detaches
 *    mid-frame during virtualization / autoUpdate scrolls (`autoUpdate`
 *    reschedules with the next live frame).
 * 6. Symmetric cleanup: `onCleanup` marks the run cancelled (so a
 *    still-pending `computePosition` from it resolves to a no-op), tears down
 *    `autoUpdate`, and invokes the run's `reset` so a re-open never inherits
 *    stale geometry.
 *
 * Position is written to the `translate` property, NOT `transform`. CSS
 * composes the individual `translate` / `rotate` / `scale` properties before
 * the `transform` property, with `translate` outermost — so a consumer's enter
 * animation on `scale` (or `transform`) pivots in place instead of scaling the
 * position offset itself, dragging the surface in from the viewport corner as
 * it grows. Leaving `transform` free for the consumer is the whole point.
 *
 * `clip-path` (rather than `visibility: hidden`) keeps the element focusable,
 * so the overlay shell's initial-focus move still lands while the surface is
 * unpainted.
 */
export function runPositioning(config: PositioningConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;

  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }

  if (config.portal !== false) {
    injectPortal();
  }

  const shouldClip = (): boolean => config.clipUntilPositioned?.() !== false;

  afterNextRender(() => {
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
    });
    if (shouldClip()) {
      el.style.clipPath = 'inset(50%)';
    }
  });

  let openCycleActive = false;
  let firstPositionFired = false;

  effect((onCleanup) => {
    const isOpen = config.open();
    const reference = config.reference();

    if (!isOpen || !reference) {
      openCycleActive = false;
      return;
    }

    if (!openCycleActive) {
      openCycleActive = true;
      firstPositionFired = false;
    }

    if (shouldClip()) {
      el.style.clipPath = 'inset(50%)';
    }

    const run = config.computeAndApply(el, reference);
    let cancelled = false;

    const cleanup = autoUpdate(reference, el, () => {
      computePosition(reference, el, {
        strategy: 'fixed',
        placement: run.placement,
        middleware: run.middleware,
      })
        .then((result) => {
          if (cancelled || !config.open()) {
            return;
          }
          el.style.translate = `${Math.round(result.x)}px ${Math.round(result.y)}px`;
          el.style.clipPath = '';
          run.apply(result);
          if (!firstPositionFired) {
            firstPositionFired = true;
            config.onFirstPosition?.();
          }
        })
        .catch(() => {});
    });

    onCleanup(() => {
      cancelled = true;
      cleanup();
      run.reset();
    });
  });
}
