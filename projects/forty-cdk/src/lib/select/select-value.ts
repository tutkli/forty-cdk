import { computed, Directive, input } from '@angular/core';

import { injectSelectContext } from './select-context';

/**
 * Renders the currently-selected option's text — or the configured
 * placeholder when nothing is selected — into its host element via
 * `textContent`. Apply on a `<span>` (or any inline element) inside
 * `[forSelectTrigger]`:
 *
 * ```html
 * <button forSelectTrigger>
 *   <span forSelectValue placeholder="Select fruit…"></span>
 * </button>
 * ```
 *
 * In multi mode the labels are joined by `separator` (default `', '`). For
 * fully custom rendering, drop this directive and read
 * `forSelect.selectedLabels()` / `forSelect.value()` from your template.
 */
@Directive({
  selector: '[forSelectValue]',
  exportAs: 'forSelectValue',
  host: {
    '[textContent]': 'displayText()',
    '[attr.data-placeholder]': 'isPlaceholder() ? "" : null',
  },
})
export class ForSelectValue {
  readonly #ctx = injectSelectContext('ForSelectValue');

  /** Text shown when nothing is selected. Falls back to `[forSelect][placeholder]`. */
  readonly placeholder = input<string>('');

  /** Joiner for multi-mode label rendering. Default `', '`. */
  readonly separator = input<string>(', ');

  protected readonly isPlaceholder = computed(() => this.#ctx.value().length === 0);

  protected readonly displayText = computed(() => {
    const labels = this.#ctx.selectedLabels();
    if (labels.length === 0) {
      return this.placeholder() || this.#ctx.placeholder();
    }
    return labels.join(this.separator());
  });
}
