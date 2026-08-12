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
   * The semantics are **per-open, not per-run**: a positioner
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
 * `[forSelectContent]`). Must be called from an injection context, and takes the `ElementRef` it
 * lives on as the floating element.
 *
 * It owns the portal, the positioning effect and `autoUpdate`, and tears all three down
 * symmetrically so a re-open never inherits stale geometry. While closed the effect tracks only
 * `open` and `reference`, so an offset or side change on a closed overlay re-runs nothing. A
 * `computePosition` that loses its reference mid-frame is swallowed, since `autoUpdate` reschedules
 * on the next live frame.
 *
 * Until the first position resolves the surface wears a `clip-path` anti-flash baseline, re-armed
 * whenever a config change restarts an open run so it stays hidden at the retained stale position.
 * `clip-path` rather than `visibility: hidden` keeps the element focusable, so the overlay shell's
 * initial-focus move still lands while the surface is unpainted.
 *
 * Position is written to `translate`, never `transform`. CSS composes `translate` outside
 * `transform`, so a consumer's `scale` enter animation pivots in place instead of scaling the
 * position offset and dragging the surface in from the viewport corner — leaving `transform` free
 * for the consumer is the point.
 *
 * SSR-safe: `effect()` runs server-side, so the browser gate here is explicit.
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
