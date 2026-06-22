import { InjectionToken, type Signal } from '@angular/core';

/**
 * Coordination contract owned by the `ForFieldset` root. A `[forFieldsetLegend]`
 * reads `legendId` and registers its presence so the fieldset can resolve its
 * `aria-labelledby`; a descendant form control optionally reads
 * `effectiveDisabled` and ORs it into its own disabled state.
 *
 * The token lives in its own file (no directive import) so a consumer of another
 * primitive — a form control reading `effectiveDisabled` here — pulls in only the
 * token, never the `ForFieldset` directive, keeping the library tree-shakable.
 */
export interface ForFieldsetContext {
  /** Id of the legend element; the group's `aria-labelledby` points here. */
  readonly legendId: Signal<string>;
  /**
   * Whether the fieldset (and therefore its descendants) is effectively
   * disabled — its own `disabled` input OR'd with an enclosing disabled
   * `[forFieldset]`, so nested groups compose like native `<fieldset disabled>`.
   * Descendant controls OR this into their own disabled state.
   */
  readonly disabled: Signal<boolean>;
  /** Mark a legend present; returns an unregister callback. */
  registerLegend(): () => void;
}

/** Injection token for the surrounding `ForFieldset` coordination contract. */
export const FOR_FIELDSET_CONTEXT = new InjectionToken<ForFieldsetContext>('FOR_FIELDSET_CONTEXT');
