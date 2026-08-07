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
import { FOR_FIELDSET_CONTEXT, injectSyntheticActivation } from 'forty-cdk/core';

import { injectFocusVisible } from './focus-visible';
import { injectHovered } from './hovered';
import { injectPressed } from './pressed';

/**
 * Headless implementation of the [WAI-ARIA Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/).
 *
 * Works on a native `<button>` host and on any arbitrary host element (e.g. `<div>`, `<span>`).
 * On a native button the platform handles Enter/Space → click synthesis and no `role` or
 * `tabindex` is emitted (the platform owns those). On a non-button host, `role="button"` and
 * `tabindex="0"` are applied, and the directive synthesizes a click through its single `onClick`
 * path: Enter activates on `keydown`, while Space activates on `keyup` (its `keydown` always
 * calls `preventDefault()` to stop the page scrolling, even when disabled) — matching native
 * button and APG behavior.
 *
 * Disabled stays focusable: per the APG a disabled button must remain reachable by assistive
 * technology, so the native `disabled` attribute is never set. Instead `aria-disabled="true"` and
 * `data-disabled=""` are reflected and the activation handler becomes a no-op. `disabled` composes
 * with a surrounding `[forFieldset]`: a disabled group disables the button too (`aria-disabled` +
 * `data-disabled`, activation suppressed), which is what makes a non-native host (`<div forButton>`)
 * behave like a native button inside a native `<fieldset disabled>`.
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
    '[attr.aria-disabled]': "effectiveDisabled() ? 'true' : null",
    '[attr.data-disabled]': "effectiveDisabled() ? '' : null",
    '[attr.data-pressed]': "pressed() ? '' : null",
    '[attr.data-hovered]': "hovered() ? '' : null",
    '[attr.data-focus-visible]': "focusVisible() ? '' : null",
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(focusin)': 'onFocusIn()',
    '(focusout)': 'onFocusOut()',
  },
})
export class ForButton {
  readonly #initialType =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.getAttribute('type');
  readonly #fieldset = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  /**
   * When `true`, activation (click, Enter, Space) is suppressed and the element
   * reflects `aria-disabled="true"` + `data-disabled=""`. The element remains
   * focusable so assistive technology can announce it. Read
   * {@link effectiveDisabled} for the value that actually gates behavior — it
   * also folds in a surrounding disabled `[forFieldset]`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The button's own {@link disabled} OR'd with a surrounding disabled
   * `[forFieldset]`. This is what gates activation and drives `aria-disabled` /
   * `data-disabled`: a native `<fieldset disabled>` never reaches a non-native
   * host (`<div forButton>`), so the group's disabled state has to compose in
   * here. Mirrors `FormUiControlBase.effectiveDisabled`, so a `[forButton]` and
   * a `[forSwitch]` inside the same disabled group behave identically.
   */
  readonly effectiveDisabled = computed(
    () => this.disabled() || (this.#fieldset?.disabled() ?? false),
  );

  /**
   * Emitted once per user activation: a pointer click on any host, or Enter / Space
   * on a non-native-button host (native buttons synthesize click from keyboard).
   */
  readonly activate = output<void>();

  readonly #focused = signal(false);
  readonly #activation = injectSyntheticActivation({ disabled: this.effectiveDisabled });
  readonly #keyboardModality = injectFocusVisible();
  protected readonly hovered = injectHovered({ disabled: this.effectiveDisabled });
  protected readonly pressed = injectPressed({ disabled: this.effectiveDisabled });
  protected readonly focusVisible = computed(() => this.#focused() && this.#keyboardModality());

  protected readonly resolvedType = computed(
    () => this.#initialType ?? (this.#activation.nativeButton ? 'button' : null),
  );
  protected readonly resolvedRole = computed(() =>
    this.#activation.nativeButton ? null : 'button',
  );
  protected readonly resolvedTabindex = this.#activation.tabindex;

  protected onClick(event: MouseEvent): void {
    if (this.effectiveDisabled()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.activate.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.#activation.keydown(event);
  }

  protected onKeyup(event: KeyboardEvent): void {
    this.#activation.keyup(event);
  }

  protected onFocusIn(): void {
    this.#focused.set(true);
  }

  protected onFocusOut(): void {
    this.#focused.set(false);
    this.#activation.reset();
  }
}
