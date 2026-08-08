import { inject, InjectionToken, type Signal } from '@angular/core';

import { orphanContextError } from 'forty-cdk/core';

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

export const FOR_DISCLOSURE_CONTEXT = new InjectionToken<ForDisclosureContext>(
  'FOR_DISCLOSURE_CONTEXT',
);

/**
 * Injects the disclosure context or throws a prefixed, actionable error
 * naming the piece that was used outside `[forDisclosure]`.
 */
export function injectDisclosureContext(piece: string): ForDisclosureContext {
  const ctx = inject(FOR_DISCLOSURE_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-DISCLOSURE-001',
      piece,
      root: '[forDisclosure]',
      token: 'FOR_DISCLOSURE_CONTEXT',
    });
  }
  return ctx;
}
