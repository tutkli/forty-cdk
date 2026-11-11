import { inject, InjectionToken, type Signal } from '@angular/core';

import { assertRootContext, orphanContextError } from 'forty-cdk/core';

/**
 * Shared state contract between the pieces of a Disclosure primitive.
 * Provided by `ForDisclosure`, consumed by `ForDisclosureTrigger` and
 * `ForDisclosureContent`.
 */
export interface ForDisclosureContext {
  readonly open: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  /** Adopts a consumer-set static `id` on the trigger host into `triggerId`. */
  adoptTriggerId(el: HTMLElement): void;
  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void;
  toggle(): void;
}

/**
 * DI token for the disclosure's coordination surface, provided by `[forDisclosure]`.
 *
 * Publicly typed as the read surface {@link ForDisclosureContext}, which is the whole of
 * what the token promises a consumer. The pieces read the same token at an internal type
 * that adds the content-registration protocol, so a wrapper re-providing it must alias it
 * to the root: `{ provide: FOR_DISCLOSURE_CONTEXT, useExisting: MyDisclosure }`, where
 * `MyDisclosure` extends `ForDisclosure`. A value that merely satisfies the declared type
 * resolves too, and is rejected in dev mode by the first piece to reach the protocol.
 */
export const FOR_DISCLOSURE_CONTEXT = new InjectionToken<ForDisclosureContext>(
  'FOR_DISCLOSURE_CONTEXT',
);

/**
 * The disclosure's internal coordination surface: everything
 * {@link ForDisclosureContext} publishes plus the content-registration protocol
 * the trigger's `aria-controls` is derived from.
 *
 * Never exported from `public-api.ts`. `ForDisclosure` declares the protocol
 * members TS-`private`, which keeps them out of the emitted `.d.ts` while
 * `useExisting` still satisfies this contract at runtime.
 */
export interface DisclosureContext extends ForDisclosureContext {
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;
  /** Whether a `[forDisclosureContent]` is mounted, so the trigger can reference it. */
  hasContent(): boolean;
}

/**
 * Injects the disclosure context or throws a prefixed, actionable error
 * naming the piece that was used outside `[forDisclosure]`.
 */
export function injectDisclosureContext(piece: string): DisclosureContext {
  const ctx = inject(FOR_DISCLOSURE_CONTEXT, { optional: true }) as DisclosureContext | null;
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-DISCLOSURE-001',
      piece,
      root: '[forDisclosure]',
      token: 'FOR_DISCLOSURE_CONTEXT',
    });
  }
  assertRootContext({
    entryPoint: 'disclosure',
    token: 'FOR_DISCLOSURE_CONTEXT',
    root: '[forDisclosure]',
    piece,
    probe: () => ctx.registerContent,
  });
  return ctx;
}
