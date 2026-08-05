/**
 * Motion applied to the toasts a mutation of the stack pushes to a new
 * position. Set it on `[forToastViewport]` via `[stackShift]`, or per scope
 * with `provideForToastDefaults({ stackShift })`.
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

/** `matrix(a, b, c, d, tx, ty)` / `matrix3d(…16 values…)`, as `getComputedStyle` serializes it. */
const TRANSFORM_MATRIX = /^matrix(3d)?\(([^)]+)\)$/;

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
 * The glide drives `transform`, never `translate`, so it composes with a
 * consumer's enter / leave keyframes instead of clobbering them. On a burst the
 * in-flight offset is carried into the restarted glide, so a row stays visually
 * continuous.
 *
 * A `MutationObserver` on the host's child list is what schedules the pass: its
 * callback is a microtask, so the measurement lands in the same turn as the
 * mutation and before paint, and it also catches the deferred unmount an
 * `animate.leave` row performs once its exit animation settles.
 */
export function createToastStackShifter(options: ToastStackShifterOptions): ToastStackShifter {
  const { host, view, shift, reducedMotion } = options;
  if (!view || typeof view.MutationObserver !== 'function') {
    return { destroy: () => {} };
  }

  const positions = new Map<HTMLElement, number>();
  const running = new Map<HTMLElement, Animation>();

  const cancel = (row: HTMLElement): void => {
    running.get(row)?.cancel();
    running.delete(row);
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
    running.set(
      row,
      row.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0px)' }], {
        duration: motion.duration,
        easing: motion.easing,
      }),
    );
  };

  const sync = (): void => {
    const motion = shift();
    if (!motion) {
      positions.clear();
      return;
    }

    const top = host.getBoundingClientRect().top;
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
      for (const row of Array.from(running.keys())) {
        cancel(row);
      }
      positions.clear();
    },
  };
}

function readTranslateY(view: Window, row: HTMLElement): number {
  const transform = view.getComputedStyle(row).transform;
  const match = transform ? TRANSFORM_MATRIX.exec(transform.trim()) : null;
  if (!match) {
    return 0;
  }
  const values = (match[2] ?? '').split(',');
  const raw = match[1] ? values[13] : values[5];
  const parsed = raw === undefined ? Number.NaN : Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}
