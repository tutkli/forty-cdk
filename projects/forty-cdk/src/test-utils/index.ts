/**
 * Internal test utilities for forty-cdk.
 *
 * NOT re-exported from `public-api.ts` — these helpers are only available
 * inside the library's own spec suite.
 */
export { renderHost, type RenderResult } from './render';
export { flush, flushPositioning } from './flush';
export { pressKey, type PressKeyOptions } from './keyboard';
export { assertA11yLabelledBy } from './a11y';
export { mountOverlay, type MountOverlayResult } from './overlay';
