import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  type WritingDirection,
} from 'forty-cdk/core';

/**
 * Registry entry for one `ForAccordionTrigger`. Triggers register their host
 * element so the root can drive keyboard navigation over its own triggers
 * without an unscoped DOM query that would leak into nested accordions.
 *
 * Part of the registration protocol, so it is never exported from
 * `public-api.ts` — see {@link AccordionContext}.
 */
export interface ForAccordionTriggerHandle {
  readonly host: HTMLElement;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by the `ForAccordion` root.
 * Items derive their state from this context; triggers route clicks and
 * keyboard navigation through it.
 */
export interface ForAccordionContext {
  readonly multiple: Signal<boolean>;
  readonly collapsible: Signal<boolean>;
  /** Whether the whole accordion is disabled; each item ORs this into its own disabled state. */
  readonly disabled: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  isExpanded(itemValue: string): boolean;
  toggle(itemValue: string): void;
  /** Whether the given item is allowed to collapse right now. */
  canCollapse(itemValue: string): boolean;
  /**
   * Focus a sibling trigger relative to the one currently focused. Disabled
   * triggers are skipped. `currentTrigger` is the element from which the
   * keyboard event originated. Navigation stays within this accordion's own
   * registered triggers, so a nested accordion does not cross-contaminate.
   */
  focusByOffset(currentTrigger: HTMLElement, action: ListNavigationAction): void;
}

/**
 * Per-item state contract. Provided by `ForAccordionItem`, consumed by
 * its `ForAccordionTrigger` and `ForAccordionContent`.
 */
export interface ForAccordionItemContext {
  readonly expanded: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly value: Signal<string>;
  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  /** Adopts a consumer-set static `id` on the trigger host into `triggerId`. */
  adoptTriggerId(el: HTMLElement): void;
  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void;
  toggle(): void;
}

/**
 * DI token for the accordion's coordination surface, provided by `[forAccordion]`.
 *
 * Publicly typed as the read surface {@link ForAccordionContext};
 * {@link injectAccordionContext} reads the same token at its internal
 * {@link AccordionContext} type so the pieces reach the registration protocol.
 */
export const FOR_ACCORDION_CONTEXT = new InjectionToken<ForAccordionContext>(
  'FOR_ACCORDION_CONTEXT',
);

export const FOR_ACCORDION_ITEM_CONTEXT = new InjectionToken<ForAccordionItemContext>(
  'FOR_ACCORDION_ITEM_CONTEXT',
);

/**
 * The accordion's internal coordination surface: everything
 * {@link ForAccordionContext} publishes plus the trigger-registration protocol
 * the root drives keyboard navigation from.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_ACCORDION_CONTEXT} at, so a consumer who injects that token gets
 * the read surface while the pieces get the wiring protocol. `ForAccordion`
 * declares the protocol members TS-`private`, which keeps them out of the
 * emitted `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface AccordionContext extends ForAccordionContext {
  registerTrigger(handle: ForAccordionTriggerHandle): void;
  unregisterTrigger(handle: ForAccordionTriggerHandle): void;
}

export function injectAccordionContext(piece: string): AccordionContext {
  const ctx = inject(FOR_ACCORDION_CONTEXT, { optional: true }) as AccordionContext | null;
  if (!ctx) {
    throw new Error(`[forty-cdk/accordion] ${piece} must be used inside a [forAccordion] element.`);
  }
  assertRootContext({
    entryPoint: 'accordion',
    token: 'FOR_ACCORDION_CONTEXT',
    root: '[forAccordion]',
    piece,
    probe: () => ctx.registerTrigger,
  });
  return ctx;
}

export function injectAccordionItemContext(piece: string): ForAccordionItemContext {
  const ctx = inject(FOR_ACCORDION_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/accordion] ${piece} must be used inside a [forAccordionItem] element.`,
    );
  }
  return ctx;
}
