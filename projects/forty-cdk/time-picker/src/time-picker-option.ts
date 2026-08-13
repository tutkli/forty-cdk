import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { registerHandle, hostId, resolveListNavigation } from 'forty-cdk/core';
import { injectTimePickerContext } from './time-picker-context';

/**
 * One option inside a `[forTimePickerContent]`. Apply on a `<div>` (or any
 * non-button element) — the option handles Enter/Space activation itself in its
 * keydown handler because a `<div>` has no native keyboard click.
 *
 * @typeParam D The adapter's date-time type (inferred from `[value]`).
 *
 * Hovering an enabled slot hands it `data-highlighted`, so pointer and keyboard
 * feed one highlight and exactly one slot is ever decorated. Hover never moves
 * DOM focus and never selects — the pointer's own click activates — and moving
 * the pointer off `[forTimePickerContent]` hands the highlight back to the
 * focused slot.
 *
 * Keyboard while focused:
 * - **Enter / Space** — activate (select the slot).
 * - **ArrowDown / ArrowUp / Home / End** — move focus inside the listbox.
 * - **Tab / Shift+Tab** — commit the focused slot and let the browser advance
 *   focus to the next / previous focusable.
 * - **Escape** — routed through the content's keydown to close the listbox.
 */
@Directive({
  selector: '[forTimePickerOption]',
  exportAs: 'forTimePickerOption',
  host: {
    role: 'option',
    tabindex: '-1',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
    '(pointermove)': 'onPointerMove()',
  },
})
export class ForTimePickerOption<D = unknown> {
  readonly #ctx = injectTimePickerContext<D>('ForTimePickerOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The date-time value this option represents. Provided by the parent
   * `[forTimePicker]`'s `slots()` computed.
   */
  readonly value = input.required<D>();

  /** When `true`, this option cannot be selected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = hostId('for-time-picker-option');

  readonly selected = computed(
    () => this.#ctx.value() !== null && this.#ctx.isSelected(this.value()),
  );
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.effectiveDisabled());

  readonly #focused = signal(false);
  /**
   * True when this slot is the active candidate — the one the pointer is over,
   * else the DOM-focused one. Reflected as `data-highlighted`.
   */
  readonly highlighted = computed(() => {
    const pointed = this.#ctx.pointerHighlightedOption();
    if (pointed !== null) {
      return pointed === this.#host.nativeElement;
    }
    return this.#focused();
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.#ctx.overlay.registerOption(h),
      (h) => this.#ctx.overlay.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#ctx.readonly()) {
      return;
    }
    this.#ctx.activate(this.value());
  }

  protected onFocus(): void {
    this.#focused.set(true);
    this.#ctx.notifyOptionFocus();
    this.#host.nativeElement.scrollIntoView?.({ block: 'nearest' });
  }

  protected onBlur(): void {
    this.#focused.set(false);
  }

  protected onPointerMove(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#ctx.highlightFromPointer(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#ctx.activate(this.value());
      return;
    }

    if (event.key === 'Tab') {
      if (this.#ctx.modal()) {
        return;
      }
      this.#ctx.commitOnTab(this.value());
      return;
    }

    const action = resolveListNavigation(event, {
      orientation: this.#ctx.orientation(),
      dir: this.#ctx.dir(),
    });
    if (action) {
      event.preventDefault();
      this.#ctx.overlay.navigate(this.#host.nativeElement, action);
    }
  }
}
