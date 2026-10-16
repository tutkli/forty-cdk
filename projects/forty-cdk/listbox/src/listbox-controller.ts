import { computed, Directive, effect, ElementRef, inject, input, untracked } from '@angular/core';

import { isImeComposing } from 'forty-cdk/core';
import { asListboxContext, type ForListboxContext } from './listbox-context';

const CARET_KEYS = new Set(['Home', 'End', 'ArrowLeft', 'ArrowRight']);

/**
 * Drives a `[forListbox]` from an external textbox, following the
 * [WAI-ARIA editable combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
 * with a list that is always shown, which is the shape of a command palette.
 * Apply it on the `<input>` and pass the listbox it drives:
 * `[forListboxController]="list"`, with `#list="forListbox"` on the listbox.
 *
 * DOM focus stays in the textbox, so typing keeps editing it while the arrow
 * keys move the listbox's active option:
 *
 * - The textbox carries `role="combobox"`, `aria-controls` (the listbox id),
 *   `aria-expanded` (`"true"` while the listbox has options), and
 *   `aria-activedescendant` naming the active option. It also defaults to
 *   `aria-autocomplete="list"` and `autocomplete="off"`; a static attribute of
 *   your own overrides either.
 * - ArrowDown / ArrowUp move the active option, across `[forListboxGroup]`s and
 *   skipping disabled options, wrapping as the listbox's `loop` says. With no
 *   active option, ArrowDown lands on the first enabled option and ArrowUp on
 *   the last. The active option is scrolled into view.
 * - Enter clicks the active option, so it activates exactly as a pointer click
 *   would and runs the option's own `(click)` handler. With no active option,
 *   Enter is left alone.
 * - Home / End / ArrowLeft / ArrowRight move the caret, and they and every edit
 *   of the text drop the active option, returning visual focus to the textbox.
 * - Every other key stays with the textbox, and Escape is yours to handle
 *   (`[forSearch]` with `[clearOnEscape]="false"`).
 *
 * While a controller is registered the listbox and its options leave the tab
 * order, a press anywhere inside the listbox keeps focus in the textbox unless
 * it lands on a focusable element of your own, hovering an option makes it the
 * active one, and focus leaving the textbox marks the listbox touched. A
 * listbox takes one controller: a second one warns in dev mode, and only the
 * most recently registered one carries the combobox ARIA and handles keys.
 */
@Directive({
  selector: '[forListboxController]',
  exportAs: 'forListboxController',
  host: {
    '[attr.role]': 'active() ? "combobox" : null',
    autocomplete: 'off',
    'aria-autocomplete': 'list',
    '[attr.aria-expanded]': 'active() ? (expanded() ? "true" : "false") : null',
    '[attr.aria-controls]': 'active() ? listbox().controlsId() : null',
    '[attr.aria-activedescendant]': 'active() ? listbox().activeDescendantId() : null',
    '(keydown)': 'onKeyDown($event)',
    '(input)': 'onInput()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class ForListboxController<T = string> {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The listbox this textbox drives, passed as its `forListbox` export. */
  readonly forListboxController = input.required<ForListboxContext<T>>();

  private readonly listbox = computed(() =>
    asListboxContext(this.forListboxController(), 'ForListboxController'),
  );

  private readonly expanded = computed(() => this.listbox().options().length > 0);

  private readonly active = computed(() =>
    this.listbox().isActiveController(this.#host.nativeElement),
  );

  constructor() {
    const el = this.#host.nativeElement;
    effect((onCleanup) => {
      const listbox = this.listbox();
      untracked(() => listbox.registerController(el));
      onCleanup(() => listbox.unregisterController(el));
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (
      !this.active() ||
      event.defaultPrevented ||
      isImeComposing(event) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.listbox().moveActiveOption(event.key === 'ArrowDown' ? 'next' : 'prev');
      return;
    }
    if (event.key === 'Enter') {
      if (this.listbox().activateActiveOption()) {
        event.preventDefault();
      }
      return;
    }
    if (CARET_KEYS.has(event.key)) {
      this.listbox().clearActiveOption();
    }
  }

  private onInput(): void {
    if (this.active()) {
      this.listbox().clearActiveOption();
    }
  }

  private onFocusOut(event: FocusEvent): void {
    if (this.active()) {
      this.listbox().controllerFocusOut(event.relatedTarget);
    }
  }
}
