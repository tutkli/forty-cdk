import { inject, InjectionToken, Signal } from '@angular/core';

import type { ListNavigationAction } from '../_internal/keyboard-navigation';

/**
 * Coordination contract owned by the `ForAccordion` root.
 * Items derive their state from this context; triggers route clicks and
 * keyboard navigation through it.
 */
export interface ForAccordionContext {
  readonly multiple: Signal<boolean>;
  readonly collapsible: Signal<boolean>;
  isExpanded(itemValue: string): boolean;
  toggle(itemValue: string): void;
  /** Whether the given item is allowed to collapse right now. */
  canCollapse(itemValue: string): boolean;
  /**
   * Focus a sibling trigger relative to the one currently focused. Disabled
   * triggers are skipped. `currentTrigger` is the element from which the
   * keyboard event originated.
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
  toggle(): void;
}

export const FOR_ACCORDION_CONTEXT = new InjectionToken<ForAccordionContext>(
  'FOR_ACCORDION_CONTEXT',
);

export const FOR_ACCORDION_ITEM_CONTEXT = new InjectionToken<ForAccordionItemContext>(
  'FOR_ACCORDION_ITEM_CONTEXT',
);

export function injectAccordionContext(piece: string): ForAccordionContext {
  const ctx = inject(FOR_ACCORDION_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/accordion] ${piece} must be used inside a [forAccordion] element.`,
    );
  }
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
