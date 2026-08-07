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
 * input to seed, that markup silently disappears.
 *
 * This helper tracks ownership instead: it sets the attribute only when absent, and on the falsy
 * edge removes it only when it was the one that set it. A consumer-set `disabled` therefore
 * survives an enabled state, while a primitive-set one is cleaned up on re-enable.
 *
 * Must be called from an injection context.
 *
 * **Not the right tool for every clobber-capable host.** Two kinds of control reflect
 * `aria-disabled` + `data-disabled` with an in-handler activation guard instead: one carrying a
 * custom ARIA role, because the native attribute would drop it from the focus order where the APG
 * requires a disabled control to stay focusable; and one whose disabled state the primitive
 * auto-computes from its own position and can flip while the button holds focus, because the
 * attribute would eject focus to `<body>` at the moment the user reaches the bound. Native
 * `disabled` is correct only on genuine form elements and on single-purpose `<button>` triggers
 * whose disabled state the consumer drives through an input.
 *
 * **The two channels are mutually exclusive**: a host calling this helper must not also host-bind
 * `[attr.aria-disabled]` for the same state, since the native attribute already exposes it through
 * HTML-AAM and a second channel leaves consumers two selectors for one condition. `data-disabled`
 * stays as the styling hook. The exclusion is per state rather than per attribute — a host whose
 * `aria-disabled` encodes a *different* condition may keep it, provided it can never be `"true"`
 * while this helper owns the native attribute. `forty-cdk/no-doubled-disabled-reflection` enforces
 * the declarative form.
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
