import { Directive, inject, input } from '@angular/core';

import { injectComboboxContext } from './combobox-context';
import { FOR_COMBOBOX_DEFAULTS } from './combobox-defaults';

/**
 * Multi-mode chips area. Wrap the chips and the `<input>` together so the
 * combobox visually presents a single editable region:
 *
 * ```html
 * <div forCombobox multiple [(value)]="tags" [(query)]="query" [(open)]="open">
 *   <div forComboboxChips>
 *     @for (chip of selected(); track chip.value) {
 *       <span forComboboxChip [value]="chip.value">
 *         {{ chip.label }}
 *         <button forComboboxChipRemove></button>
 *       </span>
 *     }
 *     <input forComboboxInput />
 *   </div>
 *   …
 * </div>
 * ```
 *
 * Carries `role="group"` with `aria-label` (default `'Selected items'`,
 * override via `[ariaLabel]`) so screen readers announce the chip cluster as
 * a single unit. The directive itself doesn't manage focus or selection — the
 * chips and the input own that — but its presence groups them for
 * assistive tech.
 */
@Directive({
  selector: '[forComboboxChips]',
  exportAs: 'forComboboxChips',
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class ForComboboxChips {
  protected readonly ctx = injectComboboxContext('ForComboboxChips');
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);

  /**
   * Accessible name for the chip cluster, exposed as `role="group"`'s
   * `aria-label` so screen readers announce the selected chips as a single
   * unit. Defaults to the scope's `chipsAriaLabel` (`'Selected items'` unless
   * overridden via `provideForComboboxDefaults`); set `[ariaLabel]` to
   * override per-instance, or `null` to drop the attribute.
   */
  readonly ariaLabel = input<string | null>(this.#defaults.chipsAriaLabel);
}
