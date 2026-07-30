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
 * **Not** the right tool for every clobber-capable host. Two kinds of control
 * must reflect `aria-disabled` + `data-disabled` with an in-handler activation
 * guard instead, and never reach for this helper: one carrying a **custom ARIA
 * role** (`role="checkbox" | "switch" | "radio" | "tab" | "option" |
 * "menuitem"`, or a toggle `<button>` reflecting `aria-pressed`), because the
 * native attribute drops it from the focus order and the APG requires a
 * disabled control to stay focusable; and one whose disabled state the
 * primitive **auto-computes from its own position** and can flip while the
 * button holds focus (calendar prev / next / view trigger — #1285; carousel
 * prev / next — #1392 item 4), because the attribute would eject the user's
 * focus to `<body>` at the moment they reach the bound. Native `disabled` is
 * correct only on genuine native form elements and on real single-purpose
 * `<button>` triggers whose disabled state the **consumer** drives through an
 * input. See the disabled-reflection rule in `.claude/rules/conventions.md`.
 *
 * On a `<button>` trigger the two channels are **mutually exclusive**: a host
 * calling this helper must not also host-bind `[attr.aria-disabled]` for the
 * same state (#1455). The native attribute already exposes the unavailable
 * state through HTML-AAM, so the ARIA copy is redundant noise that leaves
 * consumers two selectors for one condition. `data-disabled=""` stays as the
 * styling hook. The exclusion is per state, not per attribute — a trigger
 * whose `aria-disabled` encodes a *different* condition may keep it, provided
 * it can never be `"true"` while this helper owns the native attribute
 * (`[forAccordionTrigger]`, whose `aria-disabled` marks an expanded panel the
 * accordion refuses to collapse). The rule does not reach the native
 * `<input>` / `<textarea>` hosts, which still emit both.
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
