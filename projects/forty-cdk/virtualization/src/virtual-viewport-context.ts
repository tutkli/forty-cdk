import { InjectionToken, inject, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

import { type VirtualItem } from './virtualizer';

/**
 * Coordination surface a {@link ForVirtualViewport} exposes to the
 * `*forVirtualFor` structural directive nested inside it.
 */
export interface ForVirtualViewportContext {
  /** The items in the currently visible window plus overscan. */
  readonly virtualItems: Signal<readonly VirtualItem[]>;
  /** The total number of items in the full (non-windowed) list. */
  readonly count: Signal<number>;
  /** Scroll axis, resolved once when the viewport initializes. */
  readonly orientation: Signal<'vertical' | 'horizontal'>;
}

/** DI token carrying the {@link ForVirtualViewportContext}. */
export const FOR_VIRTUAL_VIEWPORT_CONTEXT = new InjectionToken<ForVirtualViewportContext>(
  'FOR_VIRTUAL_VIEWPORT_CONTEXT',
);

/**
 * Resolve the enclosing viewport context, throwing a primitive-prefixed error
 * when the piece is used outside a `[forVirtualViewport]`. Internal — never
 * re-exported from the primitive barrel.
 */
export function injectVirtualViewportContext(consumer: string): ForVirtualViewportContext {
  const context = inject(FOR_VIRTUAL_VIEWPORT_CONTEXT, { optional: true });
  if (!context) {
    throw orphanContextError({
      code: 'FORCDK-VIRTUALIZATION-001',
      piece: consumer,
      root: '[forVirtualViewport]',
      token: 'FOR_VIRTUAL_VIEWPORT_CONTEXT',
    });
  }
  return context;
}
