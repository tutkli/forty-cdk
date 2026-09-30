import { type Provider } from '@angular/core';

import { createDefaults, type LocalizableText } from 'forty-cdk/core';
import { type FloatingAlign, type FloatingSide } from 'forty-cdk/core-overlay';
import type { ForComboboxOpenHighlight } from './combobox-context';

/**
 * Defaults inherited by descendant comboboxes in the surrounding injector
 * scope. Configure with `provideForComboboxDefaults` either at the
 * application root or in any component's `providers` array; partial
 * overrides merge with the parent scope.
 */
export interface ForComboboxDefaults {
  /**
   * Side the listbox is anchored to for comboboxes that don't override `side`
   * locally. Library fallback `'bottom'`.
   */
  side: FloatingSide;
  /**
   * Alignment along the chosen `side` for comboboxes that don't override
   * `align` locally. `null` (the library fallback) follows the writing
   * direction — `'start'` in LTR, `'end'` in RTL, so the listbox stays anchored
   * to the input's leading edge. Set a value here to pin one alignment for the
   * whole scope regardless of direction.
   */
  align: FloatingAlign | null;
  /**
   * Distance (px) between the combobox input/trigger and the floating
   * content along the resolved `side` axis, for comboboxes that don't
   * override `sideOffset` locally.
   */
  sideOffset: number;
  /**
   * Padding (px) added to the viewport edges for collision-aware
   * positioning, for comboboxes that don't override `collisionPadding`
   * locally. Higher values keep the floating content further from the edge
   * when `flip` / `shift` runs.
   */
  collisionPadding: number;
  /**
   * Where the editable anatomy's highlight lands on open, for comboboxes that
   * don't set `openHighlight` locally. Library fallback `'first'`.
   */
  openHighlight: ForComboboxOpenHighlight;
  /**
   * Whether a single-select editable combobox restores the selected option's
   * label into `query` when its listbox closes without a pick, for comboboxes
   * that don't set `restoreQueryOnClose` locally. Library fallback `false`.
   */
  restoreQueryOnClose: boolean;
  /**
   * Accessible name for the chevron button (`[forComboboxToggle]`), for toggles
   * that don't set `[ariaLabel]` locally. Localize it here to translate every
   * combobox toggle in the scope.
   */
  toggleAriaLabel: LocalizableText;
  /**
   * Accessible name for the multi-mode chips cluster (`[forComboboxChips]`,
   * `role="group"`), for chip clusters that don't set `[ariaLabel]` locally.
   * Localize it here to translate every combobox chip group in the scope.
   */
  chipsAriaLabel: LocalizableText;
  /**
   * Accessible name for the clear button (`[forComboboxClear]`), for clear
   * buttons that don't set `[ariaLabel]` locally. Localize it here to
   * translate every combobox clear button in the scope.
   */
  clearAriaLabel: LocalizableText;
  /**
   * Builds the `aria-label` for a chip's remove button
   * (`[forComboboxChipRemove]`) from the chip's resolved option label.
   * Override it here to translate every combobox chip remove button in the
   * scope — the name is computed per chip, so the piece exposes no
   * per-instance `[ariaLabel]` input.
   */
  chipRemoveLabel: (label: string) => string;
}

/**
 * Library fallback for combobox defaults, read at the root injector when no
 * consumer has called `provideForComboboxDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_COMBOBOX_FALLBACK_DEFAULTS: ForComboboxDefaults = {
  side: 'bottom',
  align: null,
  sideOffset: 4,
  collisionPadding: 8,
  openHighlight: 'first',
  restoreQueryOnClose: false,
  toggleAriaLabel: 'Show options',
  chipsAriaLabel: 'Selected items',
  clearAriaLabel: 'Clear',
  chipRemoveLabel: (label) => `Remove ${label}`,
};

const { token, provideDefaults } = createDefaults<ForComboboxDefaults>(
  'FOR_COMBOBOX_DEFAULTS',
  FOR_COMBOBOX_FALLBACK_DEFAULTS,
);

/** Token holding the resolved combobox defaults for the current scope. */
export const FOR_COMBOBOX_DEFAULTS = token;

/**
 * Configures forty-cdk combobox defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForComboboxDefaults(
  defaults: Partial<ForComboboxDefaults> | (() => Partial<ForComboboxDefaults>) = {},
): Provider[] {
  return provideDefaults(defaults);
}
