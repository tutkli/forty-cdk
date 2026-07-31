import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * One chip representing a selected value in multi mode. Apply on a
 * `<span>` (or any inline-block element) inside `[forComboboxChips]`.
 * The chip is **out of the Tab cycle** (`tabindex="-1"`) by design:
 * the user reaches it via the input's Backspace heuristic (Backspace on
 * an empty input focuses the last chip), then navigates between chips
 * with ArrowLeft / ArrowRight or removes them with Backspace / Delete.
 *
 * Keyboard while the chip has focus (LTR; the ArrowLeft/Right roles swap
 * in RTL so they always follow visual order):
 * - **ArrowLeft** — focus the previous chip; bounces if first.
 * - **ArrowRight** — focus the next chip; if at the last, focus the input.
 * - **Backspace / Delete** — remove this chip + focus the previous chip,
 *   or the next chip when there is no previous one (so removing the first
 *   chip lands on the new first chip), falling back to the input only when
 *   the removed chip was the last one standing.
 * - **Escape** — dismiss the open popup via the consumer's `(escapeKeyDown)`
 *   (a veto keeps it open), then return focus to the input; with the popup
 *   already closed it simply returns focus to the input.
 *
 * Click on the chip body (excluding the remove button) just focuses the
 * chip — useful as an alternative to the Backspace path.
 */
@Directive({
  selector: '[forComboboxChip]',
  exportAs: 'forComboboxChip',
  host: {
    tabindex: '-1',
    '[attr.data-value]': 'dataValue()',
    '[attr.data-disabled]': 'ctx.effectiveDisabled() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForComboboxChip<T = string> {
  protected readonly ctx = injectComboboxContext<T>('ForComboboxChip');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The value this chip represents — must match an entry in
   * `[forCombobox][(value)]` per the parent's `[compareWith]`.
   * Generic over `T` (default `string`); inferred from the binding
   * (`[value]="someObject"` specializes `T`).
   */
  readonly value = input.required<T>();

  /**
   * `data-value` reflection — for string `T` this is the value verbatim
   * (unchanged from the pre-generic behaviour); for object `T` it uses
   * the parent's `itemToFormValue` so the attribute carries the same
   * wire format as the hidden inputs (typically JSON or a per-item id).
   */
  protected readonly dataValue = computed(() => {
    const v = this.value();
    return typeof v === 'string' ? (v as string) : this.ctx.itemToFormValue()(v);
  });

  /** Resolved label of the underlying option, used by `[forComboboxChipRemove]` for its `aria-label`. */
  readonly label = computed(() => {
    const v = this.value();
    const equals = this.ctx.compareWith();
    const cached = this.ctx.selectedEntries().find((o) => equals(o.value, v));
    if (cached) {
      return cached.label;
    }
    return typeof v === 'string' ? (v as string) : this.ctx.itemToStringLabel()(v);
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerChip(h),
      (h) => this.ctx.unregisterChip(h),
    );
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.effectiveDisabled() || this.ctx.readonly()) {
      return;
    }
    const chips = this.ctx.chips();
    const index = chips.findIndex((c) => c.host === this.#host.nativeElement);
    if (index < 0) {
      return;
    }

    // In RTL the chip cluster lays out right-to-left, so ArrowRight must
    // move to the visually-next chip (= DOM-previous) and ArrowLeft to the
    // visually-previous one (= DOM-next), with the input sitting at the
    // visual leftmost edge.
    const rtl = this.ctx.dir() === 'rtl';
    const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft';
    const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight';

    switch (event.key) {
      case prevKey: {
        event.preventDefault();
        const prev = chips[index - 1];
        if (prev) {
          prev.host.focus();
        }
        break;
      }
      case nextKey: {
        event.preventDefault();
        const next = chips[index + 1];
        if (next) {
          next.host.focus();
        } else {
          // At the last chip (visual edge in either direction) — hop to the input.
          this.ctx.input()?.focus();
        }
        break;
      }
      case 'Backspace':
      case 'Delete': {
        event.preventDefault();
        const v = this.value();
        const prev = chips[index - 1];
        const next = chips[index + 1];
        this.ctx.removeValue(v);
        // Keep focus inside the chip cluster whenever a neighbour survives the
        // removal: prefer the previous chip, otherwise the next one (which
        // slides into the freed slot — so removing the first chip lands on the
        // new first chip rather than ejecting the user to the input). Only drop
        // focus into the input when the removed chip was the last one standing,
        // so the user can keep typing without chasing the caret.
        if (prev) {
          prev.host.focus();
        } else if (next) {
          next.host.focus();
        } else {
          this.ctx.input()?.focus();
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        if (this.ctx.open()) {
          event.stopPropagation();
          this.ctx.emitEscapeKeyDown(event);
        }
        if (!this.ctx.open() && this.ctx.trigger() === null) {
          this.ctx.input()?.focus();
        }
        break;
      }
    }
  }
}
