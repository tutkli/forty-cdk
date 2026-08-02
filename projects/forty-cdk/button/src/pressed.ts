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

/** Options for {@link injectPressed}. */
export interface PressedOptions {
  /**
   * When this signal reports `true`, the returned signal is forced to `false`
   * and no interaction can set it — a disabled control is never pressed.
   */
  disabled?: Signal<boolean>;
}

/**
 * Returns a `Signal<boolean>` reflecting whether the host element is currently
 * being pressed — held down via the primary pointer button, or via the
 * <kbd>Enter</kbd> / <kbd>Space</kbd> key while focused. The state clears on
 * pointer release, the pointer leaving the element mid-press, key release, or
 * `blur` (covers focus leaving the element while a key is held).
 *
 * Attaches `pointerdown` / `pointerup` / `pointerleave` / `keydown` / `keyup` /
 * `blur` listeners to the host element. The `disabled` option short-circuits
 * the result reactively (a pure `computed`, never an `effect`-written signal)
 * and also stops a fresh press from arming while disabled.
 *
 * SSR-safe: on the server no listener is attached and the signal stays
 * `false`. Must be called from an injection context (injects `ElementRef`,
 * `PLATFORM_ID`, `DestroyRef`).
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectPressed(opts?: PressedOptions): Signal<boolean> {
  const disabled = opts?.disabled;
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  if (!isBrowser) {
    return signal(false).asReadonly();
  }

  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const pressed = signal(false);

  const onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (disabled?.()) {
      return;
    }
    pressed.set(true);
  };
  const onPointerEnd = (): void => {
    pressed.set(false);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (disabled?.()) {
      return;
    }
    pressed.set(true);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    pressed.set(false);
  };
  const onBlur = (): void => {
    pressed.set(false);
  };

  const controller = new AbortController();
  const options = { signal: controller.signal };

  el.addEventListener('pointerdown', onPointerDown, options);
  el.addEventListener('pointerup', onPointerEnd, options);
  el.addEventListener('pointerleave', onPointerEnd, options);
  el.addEventListener('keydown', onKeyDown, options);
  el.addEventListener('keyup', onKeyUp, options);
  el.addEventListener('blur', onBlur, options);

  inject(DestroyRef).onDestroy(() => controller.abort());

  return computed(() => (disabled?.() ? false : pressed()));
}
