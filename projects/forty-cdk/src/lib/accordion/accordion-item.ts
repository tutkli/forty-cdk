import { booleanAttribute, computed, Directive, inject, input, signal } from '@angular/core';

import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  FOR_ACCORDION_ITEM_CONTEXT,
  type ForAccordionItemContext,
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
    '[attr.data-orientation]': 'parent.orientation()',
  },
  providers: [{ provide: FOR_ACCORDION_ITEM_CONTEXT, useExisting: ForAccordionItem }],
})
export class ForAccordionItem implements ForAccordionItemContext {
  protected readonly parent = injectAccordionContext('ForAccordionItem');
  readonly #idGen = inject(IdGenerator);

  /** Unique identifier of this item within the accordion. Required. */
  readonly value = input.required<string>();

  /**
   * When true, the trigger ignores clicks and reflects the native `disabled`
   * attribute (not `aria-disabled`). The trigger is therefore dropped from the
   * Tab order and skipped by arrow-key navigation, but stays in the
   * accessibility tree so screen readers still announce it. See
   * `ForAccordionTrigger` for the rationale (rule #561 D2).
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #triggerId = signal(this.#idGen.next('for-accordion-trigger'));
  readonly #contentId = signal(this.#idGen.next('for-accordion-content'));

  readonly triggerId = this.#triggerId.asReadonly();
  readonly contentId = this.#contentId.asReadonly();

  readonly expanded = computed(() => this.parent.isExpanded(this.value()));

  /**
   * Adopts a consumer-set static `id` on the `[forAccordionTrigger]` host into
   * `triggerId` (preserving anchors / external `aria-labelledby` references /
   * label `for`) instead of letting the `[id]` host binding clobber it.
   */
  adoptTriggerId(el: HTMLElement): void {
    adoptHostId(el, this.#triggerId);
  }

  /** Adopts a consumer-set static `id` on the content host into `contentId`. */
  adoptContentId(el: HTMLElement): void {
    adoptHostId(el, this.#contentId);
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.parent.toggle(this.value());
  }
}
