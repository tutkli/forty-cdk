import { inject, InjectionToken, Signal } from '@angular/core';

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
    throw new Error(
      `[forty-cdk/disclosure] ${piece} must be used inside a [forDisclosure] element.`,
    );
  }
  return ctx;
}
