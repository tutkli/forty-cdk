import {
  afterNextRender,
  DestroyRef,
  effect,
  inject,
  Signal,
  signal,
} from '@angular/core';

export interface ElementBox {
  /** Border-box width in CSS pixels. */
  readonly width: number;
  /** Border-box height in CSS pixels. */
  readonly height: number;
  /** scrollWidth in CSS pixels. */
  readonly scrollWidth: number;
  /** scrollHeight in CSS pixels. */
  readonly scrollHeight: number;
}

/**
 * Observes a target element's size with `ResizeObserver` and exposes the
 * result as a signal. Updates fire only when width/height/scrollWidth/
 * scrollHeight actually change.
 *
 * Returns `null` until the first measurement is taken (or while `target()`
 * is `null`). Subscribes after the first render to avoid measuring before
 * layout has settled.
 *
 * Implementation notes:
 * - One `ResizeObserver` per call. The browser batches all observers, so
 *   creating several is cheap.
 * - The signal write happens inside the observer callback, which fires
 *   outside any reactive scope — no `effect()` self-cycle.
 * - Cleaned up via `DestroyRef`.
 */
export function injectElementSize(target: Signal<HTMLElement | null>): Signal<ElementBox | null> {
  const out = signal<ElementBox | null>(null);
  let observed: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;

  const measure = (el: HTMLElement): ElementBox => ({
    width: el.clientWidth,
    height: el.clientHeight,
    scrollWidth: el.scrollWidth,
    scrollHeight: el.scrollHeight,
  });

  const sync = (el: HTMLElement): void => {
    const next = measure(el);
    const prev = out();
    if (
      !prev ||
      prev.width !== next.width ||
      prev.height !== next.height ||
      prev.scrollWidth !== next.scrollWidth ||
      prev.scrollHeight !== next.scrollHeight
    ) {
      out.set(next);
    }
  };

  // Subscribe after the first render so layout has happened.
  afterNextRender(() => {
    const el = target();
    if (el) {
      sync(el);
    }
  });

  // React to target changes (and to scrollWidth/Height changes via the observer).
  effect(() => {
    const el = target();
    if (el === observed) return;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    observed = el;
    if (!el) {
      out.set(null);
      return;
    }
    observer = new ResizeObserver(() => sync(el));
    observer.observe(el);
    sync(el);
  });

  inject(DestroyRef).onDestroy(() => {
    observer?.disconnect();
    observer = null;
    observed = null;
  });

  return out.asReadonly();
}
