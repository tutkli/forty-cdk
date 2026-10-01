import { InjectionToken, type Provider } from '@angular/core';

import type { LocalizableText } from 'forty-cdk/core';

import { provideDefaults } from './defaults';

/**
 * Motion applied to the toasts a mutation of the stack pushes to a new
 * position. Set it on `[forToastViewport]` via `[stackShift]`, or per scope
 * with `provideForToastDefaults({ stackShift })`. The glide is played on
 * `translate`, leaving `transform` to the consumer.
 *
 * `animate.enter` / `animate.leave` cover the row that mounts or unmounts;
 * this covers its siblings, which reflow to their new spot in a single frame
 * with no property of their own for CSS to transition.
 */
export interface ForToastStackShift {
  /** Duration in ms of the glide to the new position. Must be greater than `0`. */
  duration: number;
  /** Easing of the glide, as a CSS easing function. Defaults to `'linear'`. */
  easing?: string;
}

/**
 * Defaults inherited by toasts in the surrounding injector scope. Provide via
 * `provideForToastDefaults({ duration: 4000, hotkey: 'F6' })` in your app
 * config to override library defaults; the token always resolves to a
 * fully-populated value, so every key is required here and the provider takes
 * a `Partial`.
 */
export interface ForToastDefaults {
  /** Default `5000`. How long a toast stays up before auto-dismissing, in ms. */
  duration: number;
  /** Default `'F6'`. Key that moves focus to the toast viewport. */
  hotkey: string;
  /** Default `Infinity`. How many toasts one viewport renders at a time. */
  maxVisible: number;
  /**
   * Accessible name for the viewport region (`[forToastViewport]`,
   * `role="region"`), for viewports that don't set `[ariaLabel]` locally.
   * Localize it here to translate every toast viewport in the scope.
   */
  viewportAriaLabel: LocalizableText;
  /**
   * Accessible name for the close button (`[forToastClose]`), for close
   * buttons that don't set `[ariaLabel]` locally. Localize it here to
   * translate every toast close button in the scope.
   */
  closeAriaLabel: LocalizableText;
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
  overModal: 'peer' | 'inert';
  /**
   * Default `null`. Motion applied to the toasts a mutation of the stack
   * pushes to a new position, for viewports that don't set `[stackShift]`
   * locally. `null` keeps the reflow synchronous; a bare number is shorthand
   * for `{ duration }`.
   */
  stackShift: ForToastStackShift | number | null;
}

/**
 * Library fallback for toast defaults, read at the root injector when no
 * consumer has called `provideForToastDefaults`. Exported for the shared
 * defaults contract spec; not re-exported from the primitive's public entry.
 */
export const FOR_TOAST_FALLBACK_DEFAULTS: ForToastDefaults = {
  duration: 5000,
  hotkey: 'F6',
  maxVisible: Infinity,
  viewportAriaLabel: 'Notifications',
  closeAriaLabel: 'Close',
  overModal: 'peer',
  stackShift: null,
};

/**
 * Token holding the resolved toast defaults for the current injector scope.
 * The library always provides a fully-populated value (the fallback at the
 * root, or the merged result of the nearest `provideForToastDefaults`).
 */
export const FOR_TOAST_DEFAULTS = new InjectionToken<ForToastDefaults>('FOR_TOAST_DEFAULTS', {
  providedIn: 'root',
  factory: () => FOR_TOAST_FALLBACK_DEFAULTS,
});

/**
 * Configures forty-cdk toast defaults for this injector scope. Partial
 * overrides inherit unspecified keys from the parent scope (or library
 * defaults at the root).
 *
 * Pass a function instead of an object to build the overrides where
 * `inject()` is available; it runs once per injector that resolves the
 * defaults.
 */
export function provideForToastDefaults(
  defaults: Partial<ForToastDefaults> | (() => Partial<ForToastDefaults>) = {},
): Provider[] {
  return provideDefaults(FOR_TOAST_DEFAULTS, FOR_TOAST_FALLBACK_DEFAULTS, defaults);
}
