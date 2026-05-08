import { InjectionToken, type Signal } from '@angular/core';

import type {
  HostRovingContext,
  HostRovingItemHandle,
} from '../_internal/roving-tabindex/host-roving-context';

/**
 * Per-item handle stored in the toolbar's `Collection`. Buttons, links, and
 * toggle-group items (when nested) register themselves on construction so the
 * toolbar can run roving-tabindex and arrow-key navigation in DOM order.
 *
 * Extends the lifted `HostRovingItemHandle` so any `_internal/` consumer
 * that registers against the toolbar via `FOR_HOST_ROVING_CONTEXT` works
 * without a toolbar-specific handle type.
 */
export type ForToolbarItemHandle = HostRovingItemHandle;

/**
 * Coordination contract owned by `ForToolbar`.
 *
 * Extends the neutral `HostRovingContext` (the lifted "host owns roving
 * navigation for embedded items" contract in `_internal/`) plus
 * toolbar-specific extras (`loop`). Toolbar provides both
 * `FOR_TOOLBAR_CONTEXT` and `FOR_HOST_ROVING_CONTEXT` from the same
 * instance via `useExisting`, so any neutral consumer (e.g.
 * `ForToggleGroupItem`) and any toolbar-specific consumer pull the same
 * object without taking a cross-primitive import.
 */
export interface ForToolbarContext extends HostRovingContext {
  readonly loop: Signal<boolean>;
}

export const FOR_TOOLBAR_CONTEXT = new InjectionToken<ForToolbarContext>('FOR_TOOLBAR_CONTEXT');
