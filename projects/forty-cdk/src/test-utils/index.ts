/**
 * Internal test utilities for forty-cdk.
 *
 * NOT re-exported from `public-api.ts` — these helpers are only available
 * inside the library's own spec suite.
 */
export { renderHost, type RenderResult } from './render';
export { flush, flushPositioning, nextMacrotask } from './flush';
export { pressKey, type PressKeyOptions } from './keyboard';
export { assertA11yLabelledBy } from './a11y';
export { mountOverlay, type MountOverlayResult } from './overlay';
export { afterEachOverlayCleanup } from './overlay-cleanup';
export { installObserverPolyfills } from './observers';
export { pointerDownOn, focusInOn } from './outside-events';
export { TestStackedLayer } from './stacked-layer';
export { pointerEvent } from './pointer';
export { withReducedMotion } from './reduced-motion';
