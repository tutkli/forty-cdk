import { computed, Directive, input } from '@angular/core';

import { injectDatePickerContext } from './date-picker-context';

/**
 * Renders the selected date — formatted through the adapter with the root's
 * `formatOptions` — or the configured placeholder when nothing is selected,
 * into its host element via `textContent`. Apply on a `<span>` (or any inline
 * element) inside `[forDatePickerTrigger]`:
 *
 * ```html
 * <button forDatePickerTrigger>
 *   <span forDatePickerValue placeholder="Pick a date…"></span>
 * </button>
 * ```
 *
 * For fully custom rendering, drop this directive and read
 * `forDatePicker.formattedValue()` / `forDatePicker.value()` from your template.
 */
@Directive({
  selector: '[forDatePickerValue]',
  exportAs: 'forDatePickerValue',
  host: {
    '[textContent]': 'displayText()',
    '[attr.data-placeholder]': 'isPlaceholder() ? "" : null',
  },
})
export class ForDatePickerValue {
  readonly #ctx = injectDatePickerContext('ForDatePickerValue');

  /** Text shown when no date is selected. Falls back to `[forDatePicker][placeholder]`. */
  readonly placeholder = input<string>('');

  protected readonly isPlaceholder = computed(() => this.#ctx.formattedValue() === null);

  protected readonly displayText = computed(() => {
    const formatted = this.#ctx.formattedValue();
    if (formatted !== null) {
      return formatted;
    }
    return this.placeholder() || this.#ctx.placeholder();
  });
}
