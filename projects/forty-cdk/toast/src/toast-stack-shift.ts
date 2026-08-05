import { isDevMode } from '@angular/core';

/**
 * Motion applied to the toasts a mutation of the stack pushes to a new
 * position. Set it on `[forToastViewport]` via `[stackShift]`, or per scope
 * with `provideForToastDefaults({ stackShift })`. The glide is played on
 * `translate`, leaving `transform` to the consumer.
 *
 * `animate.enter` / `animate.leave` cover the row that mounts or unmounts;
 * this covers its siblings, which reflow to their new spot in a single frame
 * with no property of their own for CSS to transition.
 */
export interface ForToastStackShift {
  /** Duration in ms of the glide to the new position. Must be greater than `0`. */
  duration: number;
  /** Easing of the glide, as a CSS easing function. Defaults to `'linear'`. */
  easing?: string;
}

const DEFAULT_EASING = 'linear';

/** A `px` length, the only shape the glide's own keyframes produce. */
const PIXEL_LENGTH = /^-?(?:\d+\.?\d*|\.\d+)px$/;

/**
 * Normalizes the `[stackShift]` input (or its defaults counterpart) into a
 * fully-populated value, or `null` when the glide is off. A bare number is
 * shorthand for `{ duration }`; a non-positive or non-finite duration reads as
 * "no motion", so `[stackShift]="0"` opts a viewport out of a scope default.
 */
export function resolveStackShift(
  value: ForToastStackShift | number | null,
): ForToastStackShift | null {
  if (value === null) {
    return null;
  }
  const motion = typeof value === 'number' ? { duration: value, easing: undefined } : value;
  if (!Number.isFinite(motion.duration) || motion.duration <= 0) {
    return null;
  }
  return { duration: motion.duration, easing: motion.easing || DEFAULT_EASING };
}

/** Options {@link createToastStackShifter} needs from the viewport that owns it. */
export interface ToastStackShifterOptions {
  /** Viewport host element whose direct `[forToast]` children are the stack rows. */
  readonly host: HTMLElement;
  /** The host document's `defaultView`, or `null` when there is none. */
  readonly view: (Window & typeof globalThis) | null;
  /** Resolved motion, read per mutation. `null` keeps the reflow synchronous. */
  readonly shift: () => ForToastStackShift | null;
  /** Whether the user asked for reduced motion, read per mutation. */
  readonly reducedMotion: () => boolean;
}

/** Handle the viewport keeps so it can tear the observer down on destroy. */
export interface ToastStackShifter {
  /** Disconnects the observer and cancels every glide still in flight. Idempotent. */
  destroy(): void;
}

/**
 * FLIP for the rows a toast mutation displaces: measure the new layout, offset
 * each moved row back to where it was, animate it to zero.
 *
 * Two measurements make this work, and both are easy to get wrong:
 *
 * - The row's position is read as `viewport.getBoundingClientRect().top +
 *   row.offsetTop`, never from the row's own rect — a rect is polluted by
 *   whatever `translate` an `animate.enter` / `animate.leave` keyframe happens
 *   to be playing on that row, while both reads here are transform-immune.
 * - `row.offsetTop` alone is not enough: in a bottom-anchored stack the rows
 *   visibly move up when one is appended, yet their offset inside the viewport
 *   never changes — the viewport box is what grew.
 *
 * The glide drives `translate` — the individual transform property — and never
 * `transform`, which stays the consumer's. An animation resolves in the
 * animation origin, so it outranks every author declaration of the same
 * property including an inline one: a glide on `transform` would suppress the
 * primitive's own documented swipe recipe (`transform: translate3d(var(
 * --for-toast-swipe-movement-x), …)`) and any enter / leave keyframe written on
 * `transform` for as long as it played. `translate` is applied before
 * `transform`, so the two compose instead. On a burst the in-flight offset is
 * carried into the restarted glide, so a row stays visually continuous.
 *
 * A `MutationObserver` on the host's child list is what schedules the pass: its
 * callback is a microtask, so the measurement lands in the same turn as the
 * mutation and before paint, and it also catches the deferred unmount an
 * `animate.leave` row performs once its exit animation settles.
 *
 * That makes the baseline a measurement from the *previous* mutation, so a layout
 * change with no mutation to announce it leaves the map pointing at a spot the
 * rows have already left — and the next mutation would replay that change as a
 * glide of its full distance instead of the real travel. The two that move a
 * whole stack are watched and drop the baseline rather than being animated: a
 * window `resize` (the edge an anchored stack hangs off moves, mobile keyboards
 * included) and, for an in-flow host only, a `scroll`. Both listeners are
 * installed on the first pass that has motion, so an unset `[stackShift]` keeps
 * costing nothing but the observer.
 *
 * Known limit: a row that reflows on its own — text swapped, a late font, an
 * image settling — moves its siblings with neither a mutation nor either event,
 * so that shift is still measured from the stale baseline. A `ResizeObserver`
 * would see it, but it also fires on every add / remove, where dropping the
 * baseline is exactly wrong (a burst would stop gliding), so it needs a way to
 * tell the two apart before it is worth having.
 */
export function createToastStackShifter(options: ToastStackShifterOptions): ToastStackShifter {
  const { host, view, shift, reducedMotion } = options;
  if (!view || typeof view.MutationObserver !== 'function') {
    return { destroy: () => {} };
  }

  const positions = new Map<HTMLElement, number>();
  const running = new Map<HTMLElement, Animation>();
  const unwatch: (() => void)[] = [];
  let watchingResize = false;
  let watchingScroll = false;

  /**
   * Drops the baseline. Whatever moved the rows did not go through the child
   * list, so the map is no longer comparable to a fresh measurement and the next
   * mutation measures a clean one and glides nothing — the cheap direction to be
   * wrong in, since a stale baseline replays the whole layout change as a glide.
   */
  const invalidate = (): void => {
    positions.clear();
  };

  /** Watches lazily, so an unset `[stackShift]` installs no listener at all. */
  const watch = (type: 'resize' | 'scroll', capture: boolean): void => {
    view.addEventListener(type, invalidate, { capture, passive: true });
    unwatch.push(() => view.removeEventListener(type, invalidate, { capture }));
  };

  const cancel = (row: HTMLElement): void => {
    running.get(row)?.cancel();
    running.delete(row);
  };

  let warnedRejected = false;

  /**
   * Dev-only, once per viewport. A `throw` would be the wrong channel here for
   * the same reason it is inside an `effect`: the stack names the observer rather
   * than the binding at fault, and it would re-throw on every mutation.
   */
  const warnRejectedMotion = (motion: ForToastStackShift, error: unknown): void => {
    if (!isDevMode() || warnedRejected) {
      return;
    }
    warnedRejected = true;
    console.warn(
      `[forty-cdk/toast] [stackShift] easing ${JSON.stringify(motion.easing)} was rejected: ` +
        `${error instanceof Error ? error.message : String(error)}. The stack-shift glide is ` +
        `skipped until it is a valid CSS easing function; the rows still reflow.`,
    );
  };

  const glide = (row: HTMLElement, distance: number, motion: ForToastStackShift): void => {
    const previous = running.get(row);
    const carried = previous?.playState === 'running' ? readTranslateY(view, row) : 0;
    if (previous) {
      cancel(row);
    }
    const from = distance + carried;
    if (from === 0 || typeof row.animate !== 'function') {
      return;
    }
    // `animate` throws on an easing the platform cannot parse, and this runs
    // inside the observer callback: an escaping throw would abort the pass before
    // it prunes `running` or rewrites the baseline — leaving a map that keeps
    // detached rows and never refreshes again — and it would do so on every
    // mutation from then on, reported outside Angular's `ErrorHandler`.
    let animation: Animation;
    try {
      animation = row.animate([{ translate: `0px ${from}px` }, { translate: '0px 0px' }], {
        duration: motion.duration,
        easing: motion.easing,
      });
    } catch (error) {
      warnRejectedMotion(motion, error);
      return;
    }
    running.set(row, animation);
  };

  const sync = (): void => {
    const motion = shift();
    if (!motion) {
      positions.clear();
      // Motion off costs no measurement, but the pass this returns from is also
      // the one that prunes `running` — so a row unmounted after `[stackShift]`
      // was turned off would keep its entry, and the detached element with it,
      // for the viewport's lifetime. `isConnected` forces no layout.
      for (const row of Array.from(running.keys())) {
        if (!row.isConnected) {
          cancel(row);
        }
      }
      return;
    }

    // A resize moves the edge an anchored stack hangs off, with no mutation to
    // announce it.
    if (!watchingResize) {
      watchingResize = true;
      watch('resize', false);
    }

    const top = host.getBoundingClientRect().top;

    // A host out of flow (`position: fixed`, the documented setup) keeps its rect
    // under scroll; an in-flow one does not, so any scroll invalidates its
    // baseline — captured, because a scroll event does not bubble, and only for
    // the hosts that need it, so the recommended setup pays nothing.
    if (!watchingScroll && Boolean(host.offsetParent)) {
      watchingScroll = true;
      watch('scroll', true);
    }

    const next = new Map<HTMLElement, number>();
    for (const row of Array.from(host.querySelectorAll<HTMLElement>(':scope > [forToast]'))) {
      next.set(row, top + row.offsetTop);
    }

    if (!reducedMotion()) {
      for (const [row, to] of next) {
        const previous = positions.get(row);
        if (previous !== undefined && previous !== to) {
          glide(row, previous - to, motion);
        }
      }
    }

    for (const row of Array.from(running.keys())) {
      if (!next.has(row)) {
        cancel(row);
      }
    }

    positions.clear();
    for (const [row, to] of next) {
      positions.set(row, to);
    }
  };

  const observer = new view.MutationObserver(() => sync());
  observer.observe(host, { childList: true });

  return {
    destroy: () => {
      observer.disconnect();
      for (const remove of unwatch.splice(0)) {
        remove();
      }
      for (const row of Array.from(running.keys())) {
        cancel(row);
      }
      positions.clear();
    },
  };
}

/**
 * The block-axis component of the row's current `translate`, which mid-glide is
 * the offset this pass has to carry. `getComputedStyle` serializes the property
 * as one, two or three components (`none` when unset), so the y is the second —
 * absent means `0`. Anything that is not a `px` length is a value the glide did
 * not write, so it reads as no carry rather than as a number in the wrong unit.
 */
function readTranslateY(view: Window, row: HTMLElement): number {
  const translate = view.getComputedStyle(row).translate;
  if (!translate || translate === 'none') {
    return 0;
  }
  const raw = translate.trim().split(/\s+/)[1];
  if (raw === undefined || !PIXEL_LENGTH.test(raw)) {
    return 0;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
