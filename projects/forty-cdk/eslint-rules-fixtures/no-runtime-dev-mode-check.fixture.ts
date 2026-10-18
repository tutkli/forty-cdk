// Expected: 1× forty-cdk/no-runtime-dev-mode-check
import { isDevMode } from '@angular/core';
// Expected: 1× forty-cdk/no-runtime-dev-mode-check
import { isDevMode as devMode, signal } from '@angular/core';
// Allowed: the compile-time guard, and an `isDevMode` that is not Angular's.
import { inject } from '@angular/core';
import { isDevMode as ownDevMode } from './dev-mode';

export const gated = isDevMode() && devMode() && ownDevMode();
export const state = signal(inject(Object));

export function warnInDev(): void {
  if (typeof ngDevMode !== 'undefined' && !ngDevMode) {
    return;
  }
  if ((typeof ngDevMode === 'undefined' || ngDevMode) && gated) {
    console.warn(state());
  }
}
