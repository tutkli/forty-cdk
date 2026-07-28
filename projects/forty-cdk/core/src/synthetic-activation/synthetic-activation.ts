import { computed, ElementRef, inject, type Signal } from '@angular/core';

/** Configuration for {@link injectSyntheticActivation}. */
export interface SyntheticActivationConfig {
  /**
   * Reactive disabled state gating the synthesized activation. While truthy the
   * handlers never click the host, but `Space` keydown still calls
   * `preventDefault()` so a disabled control does not scroll the page — the
   * behavior a native `<button>` with `aria-disabled` has.
   */
  disabled?: Signal<boolean>;
}

/** Surface returned by {@link injectSyntheticActivation}. */
export interface SyntheticActivation {
  /**
   * Whether the host is a native `<button>`. The platform then owns activation
   * and tab order, so the synthesis is inert and the caller emits no `role` /
   * `tabindex` of its own.
   */
  readonly nativeButton: boolean;

  /**
   * `'0'` on a non-native host, so it is reachable with `Tab`; `null` on a
   * native `<button>`, whose tab stop the platform already owns. Host-bind it
   * as `'[attr.tabindex]': 'tabindex()'`. Disabled hosts keep their tab stop:
   * custom-role controls stay focusable per the APG.
   */
  readonly tabindex: Signal<string | null>;

  /** Wire to the host's `(keydown)`. */
  keydown(event: KeyboardEvent): void;

  /** Wire to the host's `(keyup)`. */
  keyup(event: KeyboardEvent): void;

  /**
   * Wire to the host's `(blur)` / `(focusout)`. Drops a half-finished `Space`
   * press so a `keyup` arriving after focus left cannot activate the control.
   */
  reset(): void;
}

/**
 * Gives a host that may not be a `<button>` the activation semantics of one:
 * a tab stop plus `Enter` / `Space` synthesis. The keyboard path funnels
 * through `host.click()`, so the caller keeps a single activation handler (its
 * `(click)` listener) regardless of which host element the consumer picked.
 *
 * `Enter` activates on `keydown`, `Space` on `keyup` — matching native button
 * and APG behavior. `Space` keydown always calls `preventDefault()` (even while
 * disabled) to stop the page scrolling, and a `Space` press is only honored
 * when its `keydown` reached the same host.
 *
 * On a native `<button>` every handler returns immediately and `tabindex` is
 * `null`: the platform already synthesizes click from `Enter` / `Space`, so
 * doing it again would double-activate.
 *
 * Callers own their `role`: `[forButton]` emits `role="button"` on a non-native
 * host, while the form primitives (`[forCheckbox]`, `[forSwitch]`) already
 * carry a static `role="checkbox"` / `"switch"` on every host.
 *
 * @example
 * ```ts
 * @Directive({
 *   selector: '[myControl]',
 *   host: {
 *     '[attr.tabindex]': 'tabindex()',
 *     '(click)': 'onClick()',
 *     '(keydown)': 'onKeydown($event)',
 *     '(keyup)': 'onKeyup($event)',
 *     '(blur)': 'onBlur()',
 *   },
 * })
 * export class MyControl {
 *   readonly #activation = injectSyntheticActivation({ disabled: this.disabled });
 *   protected readonly tabindex = this.#activation.tabindex;
 * }
 * ```
 */
export function injectSyntheticActivation(
  config: SyntheticActivationConfig = {},
): SyntheticActivation {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const nativeButton = host.tagName === 'BUTTON';
  const isDisabled = (): boolean => config.disabled?.() ?? false;
  let spaceHeld = false;

  return {
    nativeButton,
    tabindex: computed(() => (nativeButton ? null : '0')),
    keydown(event: KeyboardEvent): void {
      if (nativeButton) {
        return;
      }
      if (event.key === 'Enter') {
        if (isDisabled()) {
          return;
        }
        event.preventDefault();
        host.click();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        if (isDisabled()) {
          return;
        }
        spaceHeld = true;
      }
    },
    keyup(event: KeyboardEvent): void {
      if (nativeButton || event.key !== ' ' || !spaceHeld) {
        return;
      }
      spaceHeld = false;
      if (isDisabled()) {
        return;
      }
      event.preventDefault();
      host.click();
    },
    reset(): void {
      spaceHeld = false;
    },
  };
}
