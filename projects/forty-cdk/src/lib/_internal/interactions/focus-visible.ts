import { inject, type Signal } from '@angular/core';

import { InputModality } from './modality';

/**
 * Returns a `Signal<boolean>` that is `true` while the last global input
 * modality was the keyboard, and `false` after a pointer interaction (or
 * before any interaction). This is the modality half of `:focus-visible`
 * styling: a consumer that wants a focus ring only on keyboard focus combines
 * this with the element's own focused state (`:focus`, or a `focusin` /
 * `focusout` listener) — e.g. `host: { '[attr.data-focus-visible]':
 * "focused() && focusVisible() ? '' : null" }`.
 *
 * Backed by the application-scoped {@link InputModality} singleton, so every
 * consumer shares a single capture-phase `keydown` / `pointerdown` listener on
 * `document` no matter how many call this.
 *
 * SSR-safe: on the server the backing service installs no listener and the
 * signal stays `false`. Must be called from an injection context.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export function injectFocusVisible(): Signal<boolean> {
  return inject(InputModality).keyboard;
}
