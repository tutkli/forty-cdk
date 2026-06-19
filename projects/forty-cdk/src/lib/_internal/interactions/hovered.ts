import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/** Options for {@link injectHovered}. */
export interface HoveredOptions {
  /**
   * When this signal reports `true`, the returned signal is forced to `false`
   * and no interaction can set it — a disabled control is never hovered.
   */
  disabled?: Signal<boolean>;
}

/**
 * Returns a `Signal<boolean>` reflecting whether a pointing device is currently
 * hovering the host element. State is set on `pointerenter` and cleared on
 * `pointerleave`.
 *
 * Touch is suppressed: a `pointerenter` whose `pointerType` is `'touch'` does
 * not set the hovered state, so the emulated mouse-enter a tap produces on a
 * touchscreen never leaves the element stuck in a hovered state after the
 * finger lifts. Only `'mouse'` / `'pen'` pointers report hover.
 *
 * Attaches `pointerenter` / `pointerleave` listeners to the host element. The
 * `disabled` option short-circuits the result reactively (a pure `computed`,
 * never an `effect`-written signal) and also stops hover from arming while
 * disabled.
 *
 * SSR-safe: on the server no listener is attached and the signal stays
 * `false`. Must be called from an injection context (injects `ElementRef`,
 * `PLATFORM_ID`, `DestroyRef`).
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectHovered(opts?: HoveredOptions): Signal<boolean> {
  const disabled = opts?.disabled;
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  if (!isBrowser) {
    return signal(false).asReadonly();
  }

  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const hovered = signal(false);

  const onPointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      return;
    }
    if (disabled?.()) {
      return;
    }
    hovered.set(true);
  };
  const onPointerLeave = (): void => {
    hovered.set(false);
  };

  el.addEventListener('pointerenter', onPointerEnter);
  el.addEventListener('pointerleave', onPointerLeave);

  inject(DestroyRef).onDestroy(() => {
    el.removeEventListener('pointerenter', onPointerEnter);
    el.removeEventListener('pointerleave', onPointerLeave);
  });

  return computed(() => (disabled?.() ? false : hovered()));
}
