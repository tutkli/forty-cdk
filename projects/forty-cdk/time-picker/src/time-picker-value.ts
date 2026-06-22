import { computed, Directive, input } from '@angular/core';

import { injectTimePickerContext } from './time-picker-context';

/**
 * Renders the currently selected time slot's label — or the configured
 * placeholder when nothing is selected — into its host element via
 * `textContent`. Apply on a `<span>` (or any inline element) inside
 * `[forTimePickerTrigger]`:
 *
 * ```html
 * <button forTimePickerTrigger>
 *   <span forTimePickerValue placeholder="Select a time…"></span>
 * </button>
 * ```
 */
@Directive({
  selector: '[forTimePickerValue]',
  exportAs: 'forTimePickerValue',
  host: {
    '[textContent]': 'displayText()',
    '[attr.data-placeholder]': 'isPlaceholder() ? "" : null',
  },
})
export class ForTimePickerValue {
  readonly #ctx = injectTimePickerContext('ForTimePickerValue');

  /** Text shown when nothing is selected. Falls back to `[forTimePicker][placeholder]`. */
  readonly placeholder = input<string>('');

  protected readonly isPlaceholder = computed(() => this.#ctx.value() === null);

  protected readonly displayText = computed(
    () => this.#ctx.formattedValue() ?? (this.placeholder() || this.#ctx.placeholder()),
  );
}
