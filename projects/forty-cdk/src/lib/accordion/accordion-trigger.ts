import { computed, Directive, ElementRef, inject } from '@angular/core';

import {
  injectAccordionContext,
  injectAccordionItemContext,
} from './accordion-context';

/**
 * Header button for a `ForAccordionItem`. Apply on a `<button type="button">`
 * wrapped in a heading element (`<h2>`–`<h6>`) so APG landmark navigation
 * works.
 *
 * Handles ARIA wiring, click-to-toggle, and the recommended keyboard
 * navigation (ArrowDown / ArrowUp / Home / End).
 */
@Directive({
  selector: '[forAccordionTrigger]',
  exportAs: 'forAccordionTrigger',
  host: {
    '[id]': 'item.triggerId()',
    '[attr.aria-expanded]': 'item.expanded()',
    '[attr.aria-controls]': 'item.contentId()',
    '[attr.aria-disabled]': 'ariaDisabled() ? "true" : null',
    '[attr.disabled]': 'item.disabled() ? "" : null',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '(click)': 'item.toggle()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForAccordionTrigger {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #parent = injectAccordionContext('ForAccordionTrigger');
  protected readonly item = injectAccordionItemContext('ForAccordionTrigger');

  /**
   * APG: aria-disabled is true only when the panel is open AND the accordion
   * disallows collapse. A real `disabled` item is reflected via the native
   * `disabled` attribute instead.
   */
  protected readonly ariaDisabled = computed(() => {
    if (this.item.disabled()) {
      return false;
    }
    return this.item.expanded() && !this.#parent.canCollapse(this.item.value());
  });

  protected onKeyDown(event: KeyboardEvent): void {
    const el = this.#host.nativeElement;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.#parent.focusByOffset(el, 'next');
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.#parent.focusByOffset(el, 'prev');
        break;
      case 'Home':
        event.preventDefault();
        this.#parent.focusByOffset(el, 'first');
        break;
      case 'End':
        event.preventDefault();
        this.#parent.focusByOffset(el, 'last');
        break;
      default:
    }
  }
}
