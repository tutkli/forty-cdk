import { DestroyRef, effect, inject, type Signal, signal } from '@angular/core';

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
 * is `null`). The first measurement runs when the observing `effect` first
 * sees a non-null target, then on every `ResizeObserver` callback.
 *
 * Implementation notes:
 * - One `ResizeObserver` per call. The browser batches all observers, so
 *   creating several is cheap.
 * - The signal write happens inside the observer callback, which fires
 *   outside any reactive scope — no `effect()` self-cycle.
 * - A single synchronous `sync(el)` runs when the effect attaches the
 *   observer, so the target is measured exactly once on first activation.
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
