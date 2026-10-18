import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  type HostRovingContext,
  type HostRovingItemHandle,
  orphanContextError,
} from 'forty-cdk/core';

/**
 * The handle an item registers with `[forToolbar]`. The toolbar navigates its
 * registered items in DOM order and skips the disabled ones.
 */
export type ForToolbarItemHandle = HostRovingItemHandle;

/**
 * The surface `[forToolbar]` provides under `FOR_TOOLBAR_CONTEXT`: its
 * orientation, direction, disabled state and `loop` policy, the roving tab
 * stop, and the registration a custom item uses to join the toolbar's
 * arrow-key navigation.
 */
export interface ForToolbarContext extends HostRovingContext {
  readonly loop: Signal<boolean>;
}

export const FOR_TOOLBAR_CONTEXT = new InjectionToken<ForToolbarContext>('FOR_TOOLBAR_CONTEXT');

export function injectToolbarContext(piece: string): ForToolbarContext {
  const ctx = inject(FOR_TOOLBAR_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-TOOLBAR-001',
      piece,
      root: '[forToolbar]',
      token: 'FOR_TOOLBAR_CONTEXT',
    });
  }
  return ctx;
}
