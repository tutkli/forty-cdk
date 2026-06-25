import { type Provider } from '@angular/core';

import { createDefaults } from 'forty-cdk/core';

/**
 * Optional global defaults. Provide via
 * `provideForToastDefaults({ duration: 4000, hotkey: 'F6' })` in your app
 * config to override library defaults. Every key is optional — unspecified
 * keys inherit from the parent scope (or library defaults at the root).
 */
export interface ForToastDefaults {
  duration?: number;
  hotkey?: string;
  maxVisible?: number;
  /**
   * How toast viewports in this scope behave over an open modal `ForDialog` /
   * `ForDrawer`. Default `'peer'`.
   *
   * - `'peer'` — the viewport host-binds `data-for-modal-exempt`, so an open
   *   modal leaves it out of the inert pass and never treats a click on a
   *   toast as `pointerDownOutside`. A confirmation / error toast stays
   *   interactive over the modal and clicking it does not dismiss the modal.
   * - `'inert'` — the viewport drops the marker, so the modal inerts it like
   *   any other background sibling and a click on a toast dismisses the modal.
   *   Use it for low-priority / system toasts that should sit behind a
   *   critical dialog rather than steal attention from it.
   */
  overModal?: 'peer' | 'inert';
}

/** @internal Concrete shape stored against the defaults token. */
interface ResolvedToastDefaults {
  duration: number;
  hotkey: string;
  maxVisible: number;
  overModal: 'peer' | 'inert';
}

const FALLBACK: ResolvedToastDefaults = {
  duration: 5000,
  hotkey: 'F6',
  maxVisible: Infinity,
  overModal: 'peer',
};

const { token, provideDefaults } = createDefaults<ResolvedToastDefaults>(
  'FOR_TOAST_DEFAULTS',
  FALLBACK,
);

/**
 * Token holding the resolved toast defaults for the current injector scope.
 * The library always provides a fully-populated value (the fallback at the
 * root, or the merged result of the nearest `provideForToastDefaults`).
 */
export const FOR_TOAST_DEFAULTS = token;

/**
 * Configures forty-cdk toast defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 */
export function provideForToastDefaults(defaults: ForToastDefaults): Provider[] {
  return provideDefaults(defaults as Partial<ResolvedToastDefaults>);
}
