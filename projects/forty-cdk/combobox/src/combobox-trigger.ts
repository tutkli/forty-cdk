import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { hostButtonType, hostId, reflectDisabled, registerHandle } from 'forty-cdk/core';
import {
  COMBOBOX_TRIGGERS,
  type ForComboboxContext,
  injectComboboxTriggerContext,
} from './combobox-context';

/**
 * Button that opens the listbox and keeps showing the committed selection
 * (label + icon) while the search input lives **inside** the panel — the
 * "combobox with trigger" / picker anatomy. Apply on
 * a real `<button>` so Space / Enter dispatch native click events that toggle
 * via `(click)`.
 *
 * Registering a trigger switches the combobox into the picker anatomy: it
 * becomes the default positioning anchor (after an explicit
 * `[forComboboxAnchor]`), focus moves into `[forComboboxInput]` on open and
 * returns to the trigger on close (the standard `(autoFocusOnOpen)` /
 * `(autoFocusOnClose)` vetoable hooks now fire), and `[forComboboxContent]`
 * expects an inner `[forComboboxList]` to carry the listbox role while the
 * content itself becomes a `role="dialog"` named by this trigger.
 *
 * Wires `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls` (pointing to the dialog surface while open). A static `id`
 * on the host is kept; without one the trigger gets a generated id. Native
 * `disabled` reflects `effectiveDisabled` (single-purpose trigger). The
 * trigger is exempt from the popup's dismissible layer — clicks on it route
 * through `(click)` instead of racing an outside-pointer dismissal.
 *
 * It also reflects the root's form-control state (`aria-readonly` /
 * `aria-required` / `aria-invalid` / `aria-busy`, truthy-only) plus the
 * `data-readonly` styling hook, because a closed picker exposes no other
 * focusable element: the `[forComboboxInput]` that carries the same state is
 * mounted inside the panel. The `combobox` role is what supports those
 * properties, which the implicit `button` role does not. A `combobox` takes its
 * name from the author rather than from its content, so label it
 * (`aria-labelledby`, `aria-label`, or a surrounding `[forField]`).
 *
 * The trigger keeps the role while the dialog is open, alongside the
 * `role="combobox"` input inside it. They are two widgets in two contexts: the
 * trigger is the collapsed control that owns the dialog popup, the input is
 * the search field that owns the listbox popup, and focus sits on only one of
 * them at a time. Dropping the role on open would change the trigger's
 * semantics under the user while the dialog it names is showing.
 *
 * The root is normally resolved via DI from the enclosing `[forCombobox]`.
 * When the trigger is declared inside an `ng-template` stamped into the root
 * (e.g. via `ngTemplateOutlet`), DI resolves at the template's declaration
 * site and misses the root — pass it explicitly through the selector input,
 * `routerLink`-style: `[forComboboxTrigger]="root"` with `#root="forCombobox"`.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle (open moves focus into the input).
 * - **ArrowDown** — open with the committed selection highlighted, falling back
 *   to the first enabled option.
 * - **ArrowUp** — open with the committed selection highlighted, falling back
 *   to the last enabled option.
 */
@Directive({
  selector: '[forComboboxTrigger]',
  exportAs: 'forComboboxTrigger',
  host: {
    '[attr.type]': 'buttonType()',
    role: 'combobox',
    '[id]': 'id()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx().open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx().open() ? ctx().contentId() : null',
    '[attr.aria-readonly]': 'ctx().readonly() ? "true" : null',
    '[attr.aria-required]': 'ctx().required() ? "true" : null',
    '[attr.aria-invalid]': 'ctx().invalid() ? "true" : null',
    '[attr.aria-busy]': 'ctx().pending() ? "true" : null',
    '[attr.data-state]': 'ctx().open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx().effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'ctx().readonly() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForComboboxTrigger<T = unknown> {
  private readonly buttonType = hostButtonType();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Optional explicit reference to the `[forCombobox]` root, named after the
   * selector `routerLink`-style. The bare valueless attribute keeps resolving
   * the enclosing root via DI; pass the root explicitly
   * (`[forComboboxTrigger]="root"`, with `#root="forCombobox"`) when the
   * trigger is declared in an `ng-template` stamped inside the root — DI
   * resolves at the template's declaration site, so the enclosing root is
   * invisible there. The empty string (what the valueless attribute yields) is
   * treated as unset.
   */
  readonly forComboboxTrigger = input<ForComboboxContext<T> | ''>('');

  readonly #resolved = injectComboboxTriggerContext<T>(this.forComboboxTrigger);
  private readonly ctx = this.#resolved.ctx;

  private readonly id = hostId('for-combobox-trigger');

  constructor() {
    const triggers = inject(COMBOBOX_TRIGGERS);
    registerHandle(
      { host: this.#host.nativeElement, id: this.id, root: this.#resolved.root },
      (handle) => triggers.add(handle),
      (handle) => triggers.remove(handle),
    );
    reflectDisabled(computed(() => this.ctx().effectiveDisabled()));
  }

  private onClick(): void {
    this.ctx().toggle();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.ctx().effectiveDisabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx().openOverlay('selected');
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx().openOverlay(this.ctx().value().length > 0 ? 'selected' : 'last');
    }
  }
}
