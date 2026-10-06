import { InjectionToken, inject, type Signal } from '@angular/core';

import { assertRootContext, orphanContextError } from 'forty-cdk/core';

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

/**
 * The viewport's internal coordination surface: everything
 * {@link ForVirtualViewportContext} publishes plus the data channel
 * `*forVirtualFor` hands its array through, so a same-length rewrite of that
 * array recomputes the item keys.
 *
 * Never exported from `public-api.ts`. `ForVirtualViewport` declares these
 * members TS-`private`, which keeps them out of the emitted `.d.ts` while
 * `useExisting` still satisfies this contract at runtime.
 */
export interface VirtualViewportContext extends ForVirtualViewportContext {
  registerData(data: Signal<readonly unknown[]>): void;
  unregisterData(data: Signal<readonly unknown[]>): void;
}

/**
 * DI token carrying the {@link ForVirtualViewportContext}, provided by
 * `[forVirtualViewport]`.
 *
 * `*forVirtualFor` reads the same token at an internal type that adds its data
 * channel, so a wrapper re-providing it must alias it to the viewport:
 * `{ provide: FOR_VIRTUAL_VIEWPORT_CONTEXT, useExisting: MyViewport }`, where
 * `MyViewport` extends `ForVirtualViewport`. A value that merely satisfies the
 * declared type resolves too, and is rejected in dev mode by `*forVirtualFor`.
 */
export const FOR_VIRTUAL_VIEWPORT_CONTEXT = new InjectionToken<ForVirtualViewportContext>(
  'FOR_VIRTUAL_VIEWPORT_CONTEXT',
);

/**
 * Resolve the enclosing viewport context, throwing a primitive-prefixed error
 * when the piece is used outside a `[forVirtualViewport]`. Internal — never
 * re-exported from the primitive barrel.
 */
export function injectVirtualViewportContext(consumer: string): VirtualViewportContext {
  const context = inject(FOR_VIRTUAL_VIEWPORT_CONTEXT, { optional: true });
  if (!context) {
    throw orphanContextError({
      code: 'FORCDK-VIRTUALIZATION-001',
      piece: consumer,
      root: '[forVirtualViewport]',
      token: 'FOR_VIRTUAL_VIEWPORT_CONTEXT',
    });
  }
  const widened = context as VirtualViewportContext;
  assertRootContext({
    entryPoint: 'virtualization',
    token: 'FOR_VIRTUAL_VIEWPORT_CONTEXT',
    root: '[forVirtualViewport]',
    piece: consumer,
    probe: () => widened.registerData,
  });
  return widened;
}
