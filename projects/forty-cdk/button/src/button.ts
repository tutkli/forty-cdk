import {
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { injectFocusVisible, injectHovered, injectPressed } from 'forty-cdk/core';

/**
 * Headless implementation of the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
 *
 * Works on a native `<button>` host and on any arbitrary host element (e.g. `<div>`, `<span>`).
 * On a native button the platform handles Enter/Space → click synthesis and no `role` or
 * `tabindex` is emitted (the platform owns those). On a non-button host, `role="button"` and
 * `tabindex="0"` are applied, and keydown for Enter/Space synthesizes a click so the directive's
 * single `onClick` path handles all activations.
 *
 * Disabled stays focusable: per the APG a disabled button must remain reachable by assistive
 * technology, so the native `disabled` attribute is never set. Instead `aria-disabled="true"` and
 * `data-disabled=""` are reflected and the activation handler becomes a no-op.
 *
 * Interaction state is reflected as `data-pressed`, `data-hovered`, and `data-focus-visible`
 * (present/absent boolean attributes). There is no `data-state` — this primitive has no
 * open/closed or checked/unchecked logical state.
 *
 * @example
 * ```html
 * <!-- Native button — platform handles Enter/Space -->
 * <button forButton (activate)="doSomething()">Click me</button>
 *
 * <!-- Non-button host — role, tabindex, and keyboard handling added automatically -->
 * <div forButton (activate)="doSomething()">Click me</div>
 *
 * <!-- Disabled: stays focusable, activation is a no-op -->
 * <button forButton [disabled]="true" (activate)="doSomething()">Disabled</button>
 * ```
 */
@Directive({
  selector: '[forButton]',
  exportAs: 'forButton',
  host: {
    '[attr.type]': 'resolvedType()',
    '[attr.role]': 'resolvedRole()',
    '[attr.tabindex]': 'resolvedTabindex()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[attr.data-disabled]': "disabled() ? '' : null",
    '[attr.data-pressed]': "pressed() ? '' : null",
    '[attr.data-hovered]': "hovered() ? '' : null",
    '[attr.data-focus-visible]': "focusVisible() ? '' : null",
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
  },
})
export class ForButton {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #isNativeButton = this.#host.tagName === 'BUTTON';
  readonly #initialType = this.#host.getAttribute('type');

  /**
   * When `true`, activation (click, Enter, Space) is suppressed and the element
   * reflects `aria-disabled="true"` + `data-disabled=""`. The element remains
   * focusable so assistive technology can announce it.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Emitted once per user activation: a pointer click on any host, or Enter / Space
   * on a non-native-button host (native buttons synthesize click from keyboard). The
   * name `activate` is chosen deliberately to avoid colliding with the native `click`
   * event (which would trip `@angular-eslint/no-output-native` on wrapping consumers).
   */
  readonly activate = output<void>();

  readonly #focused = signal(false);
  readonly #keyboardModality = injectFocusVisible();
  protected readonly hovered = injectHovered({ disabled: this.disabled });
  protected readonly pressed = injectPressed({ disabled: this.disabled });
  protected readonly focusVisible = computed(() => this.#focused() && this.#keyboardModality());

  protected readonly resolvedType = computed(
    () => this.#initialType ?? (this.#isNativeButton ? 'button' : null),
  );
  protected readonly resolvedRole = computed(() => (this.#isNativeButton ? null : 'button'));
  protected readonly resolvedTabindex = computed(() => (this.#isNativeButton ? null : '0'));

  protected onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.activate.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.#isNativeButton) {
      return;
    }
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (this.disabled()) {
      return;
    }
    event.preventDefault();
    this.#host.click();
  }

  protected onFocusIn(): void {
    this.#focused.set(true);
  }

  protected onFocusOut(): void {
    this.#focused.set(false);
  }
}
