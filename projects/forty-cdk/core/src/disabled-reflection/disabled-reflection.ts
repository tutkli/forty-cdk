import { effect, ElementRef, inject, type Signal } from '@angular/core';

/**
 * Non-destructively reflects a `disabled` signal onto the host element's native
 * `disabled` attribute.
 *
 * The naive host binding `'[attr.disabled]': 'disabled() ? "" : null'` is
 * destructive: its `null` branch removes the attribute on the first change
 * detection whenever the expression is falsy, clobbering a `disabled` attribute
 * the consumer set themselves (a static `disabled` in the template, or an
 * imperative `setAttribute('disabled', '')`) even though the primitive never
 * owned it. For a host whose disabled expression has no same-element `disabled`
 * input to seed, that markup silently disappears — the wrapper-friendliness
 * failure first fixed for the dropdown trigger in #640 / #651.
 *
 * This helper tracks ownership instead: it sets the attribute only when it is
 * absent (so a pre-existing consumer attribute is never re-stamped or claimed),
 * and on the falsy edge removes it only when this helper is the one that set it.
 * A consumer-set `disabled` therefore always survives an enabled state, while a
 * primitive-set one is cleaned up cleanly on re-enable.
 *
 * Mirrors the imperative reflection #651 introduced on `[forDropdownMenuTrigger]`
 * and is the single implementation every clobber-capable host shares.
 *
 * Writing the DOM attribute is a genuine side effect (it escapes the reactive
 * graph) and the ownership flag is a plain closure variable, not a signal — so
 * this is a sanctioned `effect()` use, not state propagation.
 *
 * Must be called from an injection context (it injects `ElementRef` and creates
 * an `effect`), typically a directive constructor.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 *
 * @param disabled Signal whose truthiness drives the native `disabled`
 *   attribute on the host element.
 */
export function reflectDisabled(disabled: Signal<boolean>): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  let owned = false;
  effect(() => {
    if (disabled()) {
      if (!host.hasAttribute('disabled')) {
        host.setAttribute('disabled', '');
        owned = true;
      }
    } else if (owned) {
      host.removeAttribute('disabled');
      owned = false;
    }
  });
}
