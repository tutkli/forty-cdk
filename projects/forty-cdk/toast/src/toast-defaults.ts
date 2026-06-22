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
}

/** @internal Concrete shape stored against the defaults token. */
interface ResolvedToastDefaults {
  duration: number;
  hotkey: string;
  maxVisible: number;
}

const FALLBACK: ResolvedToastDefaults = {
  duration: 5000,
  hotkey: 'F6',
  maxVisible: Infinity,
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
