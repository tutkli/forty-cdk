import {
  afterNextRender,
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { hostButtonType, hostId, registerHandle } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * A non-selecting **action** affordance pinned inside a `[forComboboxContent]`
 * (or beside `[forComboboxList]` in the picker anatomy) — "Create new…",
 * "Manage tags…", "Clear all", etc. Apply on a `<button>` (or any element);
 * the directive carries `role="button"` so it reads and behaves as an action,
 * never as one of the listbox's options. On a native `<button>` host it also
 * forces `type="button"` — through a host binding, so a consumer `type="submit"`
 * is overridden and activating the action never submits a surrounding `<form>`;
 * any other host element gets no `type` attribute, which is not valid there.
 *
 * Unlike `[forComboboxOption]`, an action:
 *
 * - does **not** register with the option / value collection, so it never
 *   appears in `value()`, `aria-setsize`, or `aria-posinset`;
 * - emits an `(activate)` output on activation (click / Enter / Space) and
 *   **never** mutates `[(value)]`;
 * - is reached by keyboard through Tab, not the option arrow navigation — see
 *   the focus model below.
 *
 * **Focus & keyboard (model A).** While the popup is open, Tab / Shift+Tab
 * cycle DOM focus around the ring `[input, ...enabled actions]` (in DOM order,
 * wrapping both ways) **without dismissing** the popup, so a pinned action is
 * reachable in a bounded number of keypresses regardless of how long the option
 * list is (or whether it is virtualized). Escape and outside-pointer still
 * dismiss; on Escape from an action, focus returns to the input (editable
 * anatomy) or the `[forComboboxTrigger]` (picker anatomy). Options stay
 * arrow-navigated via `aria-activedescendant` — the two models never mix.
 *
 * Because the action lives inside the portaled `[forComboboxContent]`, it is
 * naturally "inside" the outside-pointer / outside-focus dismissal checks, just
 * like the input.
 *
 * The action must be a sibling of the listbox, never a child of it: in the
 * editable anatomy `[forComboboxContent]` carries `role="listbox"`, which may
 * only own `option` / `group` children, so the options are wrapped in a
 * `[forComboboxList]` and the action sits beside it under the (now role-less)
 * content.
 *
 * ```html
 * <div forComboboxContent>
 *   <button forComboboxAction (activate)="createNew(query())">
 *     Create "{{ query() }}"
 *   </button>
 *   <div forComboboxList>
 *     @for (item of filtered(); track item.id) {
 *       <div forComboboxOption [value]="item">{{ item.name }}</div>
 *     }
 *   </div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forComboboxAction]',
  exportAs: 'forComboboxAction',
  host: {
    role: 'button',
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.tabindex]': 'disabled() ? null : "-1"',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-highlighted]': 'focused() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'focused.set(true)',
    '(blur)': 'focused.set(false)',
  },
})
export class ForComboboxAction {
  protected readonly buttonType = hostButtonType();

  readonly #ctx = injectComboboxContext('ForComboboxAction');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Disable the action. A disabled action drops out of the focus ring (its
   * `tabindex` is removed and keyboard navigation skips it), reflects
   * `aria-disabled="true"` + `data-disabled=""`, and ignores activation.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Fired on click / Enter / Space. Purely a side-effect hook — it **never**
   * mutates `[(value)]`, so the form model and `options()` are untouched. The
   * consumer decides what happens (create an item, open a dialog, …) and whether
   * to close the popup afterwards.
   */
  readonly activate = output<void>();

  /** Stable id for the host, used as the ring key. Adopts a consumer-set static `id`. */
  readonly id = hostId('for-combobox-action');

  /** True while the action holds DOM focus — reflected as `data-highlighted`. */
  protected readonly focused = signal(false);

  readonly #handle = {
    host: this.#host.nativeElement,
    id: this.id,
    disabled: this.disabled,
  };

  constructor() {
    registerHandle(
      this.#handle,
      (h) => this.#ctx.registerAction(h),
      (h) => this.#ctx.unregisterAction(h),
    );

    afterNextRender(() => {
      if (!this.#ctx.hasList()) {
        throw new Error(
          '[forty-cdk/combobox] [forComboboxAction] must be nested inside a [forComboboxContent] that also contains a [forComboboxList]. In the editable anatomy [forComboboxContent] carries role="listbox", so a role="button" action placed directly inside it is an invalid listbox child (aria-required-owned). Wrap the options in a <div forComboboxList> so the action becomes a sibling of the listbox.',
        );
      }
    });
  }

  protected onClick(): void {
    if (this.#isInert()) {
      return;
    }
    this.activate.emit();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (this.disabled()) {
          return;
        }
        event.preventDefault();
        if (!this.#isInert()) {
          this.activate.emit();
        }
        break;

      case 'Tab':
        if (!this.#ctx.open()) {
          return;
        }
        event.preventDefault();
        this.#ctx.moveActionFocus(this.id(), event.shiftKey ? 'prev' : 'next');
        break;

      case 'Escape':
        if (this.disabled()) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.#ctx.emitEscapeKeyDown(event);
        if (!this.#ctx.open() && this.#ctx.trigger() === null) {
          this.#ctx.input()?.focus();
        }
        break;
    }
  }

  #isInert(): boolean {
    return this.disabled() || this.#ctx.effectiveDisabled();
  }
}
