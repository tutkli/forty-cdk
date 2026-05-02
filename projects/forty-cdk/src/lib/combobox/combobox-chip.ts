import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { injectComboboxContext } from './combobox-context';

/**
 * One chip representing a selected value in multi mode. Apply on a
 * `<span>` (or any inline-block element) inside `[forComboboxChips]`.
 * The chip is **out of the Tab cycle** (`tabindex="-1"`) by design:
 * the user reaches it via the input's Backspace heuristic (Backspace on
 * an empty input focuses the last chip), then navigates between chips
 * with ArrowLeft / ArrowRight or removes them with Backspace / Delete.
 *
 * Keyboard while the chip has focus:
 * - **ArrowLeft** — focus the previous chip; bounces if first.
 * - **ArrowRight** — focus the next chip; if at the last, focus the input.
 * - **Backspace / Delete** — remove this chip + focus the previous chip
 *   (or the input when the chip was the last).
 * - **Escape** — return focus to the input.
 *
 * Click on the chip body (excluding the remove button) just focuses the
 * chip — useful as an alternative to the Backspace path.
 */
@Directive({
  selector: '[forComboboxChip]',
  exportAs: 'forComboboxChip',
  host: {
    tabindex: '-1',
    '[attr.data-value]': 'value()',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForComboboxChip {
  protected readonly ctx = injectComboboxContext('ForComboboxChip');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The value this chip represents — must match an entry in `[forCombobox][(value)]`. */
  readonly value = input.required<string>();

  /** Resolved label of the underlying option, used by `[forComboboxChipRemove]` for its `aria-label`. */
  readonly label = computed(() => {
    const v = this.value();
    const cached = this.ctx.cachedOptions().find((o) => o.value === v);
    return cached ? cached.label : v;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
    };
    this.ctx.registerChip(handle);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterChip(handle));
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled() || this.ctx.readonly()) {
      return;
    }
    const chips = this.ctx.chips();
    const index = chips.findIndex((c) => c.host === this.#host.nativeElement);
    if (index < 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft': {
        event.preventDefault();
        const prev = chips[index - 1];
        if (prev) {
          prev.host.focus();
        }
        break;
      }
      case 'ArrowRight': {
        event.preventDefault();
        const next = chips[index + 1];
        if (next) {
          next.host.focus();
        } else {
          // At the last chip — hop to the input.
          this.ctx.input()?.focus();
        }
        break;
      }
      case 'Backspace':
      case 'Delete': {
        event.preventDefault();
        const v = this.value();
        const prev = chips[index - 1];
        const isLast = index === chips.length - 1;
        this.ctx.removeValue(v);
        // Move focus to the previous chip; if there isn't one (we removed
        // the only chip, or the chip was the last one), drop focus into the
        // input so the user can keep typing without chasing the caret.
        if (prev) {
          prev.host.focus();
        } else if (isLast) {
          this.ctx.input()?.focus();
        } else {
          this.ctx.input()?.focus();
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        this.ctx.input()?.focus();
        break;
      }
    }
  }
}
