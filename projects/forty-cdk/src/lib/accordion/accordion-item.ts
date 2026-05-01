import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
import {
  FOR_ACCORDION_ITEM_CONTEXT,
  ForAccordionItemContext,
  injectAccordionContext,
} from './accordion-context';

/**
 * One section of a `ForAccordion`. Owns the unique `value` identifying this
 * item to the root and exposes the per-item context that the trigger and
 * content read.
 */
@Directive({
  selector: '[forAccordionItem]',
  exportAs: 'forAccordionItem',
  host: {
    '[attr.data-state]': 'expanded() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [
    { provide: FOR_ACCORDION_ITEM_CONTEXT, useExisting: ForAccordionItem },
  ],
})
export class ForAccordionItem implements ForAccordionItemContext {
  readonly #parent = injectAccordionContext('ForAccordionItem');
  readonly #idGen = inject(IdGenerator);

  /** Unique identifier of this item within the accordion. Required. */
  readonly value = input.required<string>();

  /** When true, the trigger ignores clicks and reflects `disabled`. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly triggerId = signal(this.#idGen.next('for-accordion-trigger'));
  readonly contentId = signal(this.#idGen.next('for-accordion-content'));

  readonly expanded = computed(() => this.#parent.isExpanded(this.value()));

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.#parent.toggle(this.value());
  }
}
