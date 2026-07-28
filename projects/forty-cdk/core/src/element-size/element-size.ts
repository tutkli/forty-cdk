import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, effect, inject, PLATFORM_ID, type Signal, signal } from '@angular/core';

export interface ElementBox {
  /** Padding-box width (`clientWidth`) in CSS pixels — content plus padding, excluding borders and any scrollbar. */
  readonly width: number;
  /** Padding-box height (`clientHeight`) in CSS pixels — content plus padding, excluding borders and any scrollbar. */
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
 * - Browser-only: `ResizeObserver` is a DOM API, so off-browser (SSR) the
 *   helper returns a frozen `signal(null)` and never constructs an observer.
 * - One `ResizeObserver` per call. The browser batches all observers, so
 *   creating several is cheap.
 * - The last emitted box is held in a plain `prev` variable, not read back
 *   from the `out` signal, so the effect never reads-and-writes the same
 *   signal (the activation `sync(el)` would otherwise be a self-cycle).
 * - A single synchronous `sync(el)` runs when the effect attaches the
 *   observer, so the target is measured exactly once on first activation.
 * - Cleaned up via `DestroyRef`.
 */
export function injectElementSize(target: Signal<HTMLElement | null>): Signal<ElementBox | null> {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return signal<ElementBox | null>(null).asReadonly();
  }

  const out = signal<ElementBox | null>(null);
  let observed: HTMLElement | null = null;
  let observer: ResizeObserver | null = null;
  let prev: ElementBox | null = null;

  const measure = (el: HTMLElement): ElementBox => ({
    width: el.clientWidth,
    height: el.clientHeight,
    scrollWidth: el.scrollWidth,
    scrollHeight: el.scrollHeight,
  });

  const sync = (el: HTMLElement): void => {
    const next = measure(el);
    if (
      !prev ||
      prev.width !== next.width ||
      prev.height !== next.height ||
      prev.scrollWidth !== next.scrollWidth ||
      prev.scrollHeight !== next.scrollHeight
    ) {
      prev = next;
      out.set(next);
    }
  };

  // React to target changes (and to scrollWidth/Height changes via the observer).
  // @sanctioned-effect(external-source): `out` mirrors a ResizeObserver, and the
  // last emitted box is held in `prev` rather than read back from `out`, so no
  // read in this effect can depend on the signal it writes.
  effect(() => {
    const el = target();
    if (el === observed) return;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    observed = el;
    if (!el) {
      prev = null;
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
