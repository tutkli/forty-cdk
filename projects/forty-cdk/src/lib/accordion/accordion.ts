import {
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

import { FOR_ACCORDION_CONTEXT, ForAccordionContext } from './accordion-context';

/**
 * Root of the Accordion primitive. Holds the open value(s) and orchestrates
 * single/multiple expansion, collapse rules, and keyboard navigation between
 * triggers.
 *
 * Implements the [WAI-ARIA Accordion pattern](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
 *
 * State is modeled as `value: readonly string[]` regardless of mode:
 * - In single mode (`multiple=false`, default), the array has 0 or 1 element.
 * - In multiple mode, any number of items can be open.
 *
 * @example
 * ```html
 * <div forAccordion [(value)]="open" collapsible>
 *   <div forAccordionItem value="a">
 *     <h3><button type="button" forAccordionTrigger>A</button></h3>
 *     <section forAccordionContent>...</section>
 *   </div>
 *   <div forAccordionItem value="b">...</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forAccordion]',
  exportAs: 'forAccordion',
  host: {
    '[attr.data-orientation]': '"vertical"',
  },
  providers: [{ provide: FOR_ACCORDION_CONTEXT, useExisting: ForAccordion }],
})
export class ForAccordion implements ForAccordionContext {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** When true, multiple items can be expanded simultaneously. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Single mode only: when true, the open item can be collapsed by clicking
   * its trigger. When false, exactly one item stays open at all times once
   * any has been opened.
   */
  readonly collapsible = input(false, { transform: booleanAttribute });

  /**
   * Two-way bindable. List of currently expanded item values. In single
   * mode the array has 0 or 1 element.
   */
  readonly value = model<readonly string[]>([]);

  isExpanded(itemValue: string): boolean {
    return this.value().includes(itemValue);
  }

  toggle(itemValue: string): void {
    const current = this.value();
    const isOpen = current.includes(itemValue);

    if (isOpen) {
      if (!this.canCollapse(itemValue)) {
        return;
      }
      this.value.set(current.filter((v) => v !== itemValue));
      return;
    }

    if (this.multiple()) {
      this.value.set([...current, itemValue]);
    } else {
      this.value.set([itemValue]);
    }
  }

  canCollapse(_itemValue: string): boolean {
    return this.multiple() || this.collapsible();
  }

  focusByOffset(
    currentTrigger: HTMLElement,
    target: 'next' | 'prev' | 'first' | 'last',
  ): void {
    const triggers = Array.from(
      this.#host.nativeElement.querySelectorAll<HTMLElement>('[forAccordionTrigger]'),
    ).filter((el) => !el.hasAttribute('disabled'));

    if (triggers.length === 0) {
      return;
    }

    let nextIndex: number;
    if (target === 'first') {
      nextIndex = 0;
    } else if (target === 'last') {
      nextIndex = triggers.length - 1;
    } else {
      const currentIndex = triggers.indexOf(currentTrigger);
      if (currentIndex === -1) {
        return;
      }
      const offset = target === 'next' ? 1 : -1;
      nextIndex = (currentIndex + offset + triggers.length) % triggers.length;
    }

    triggers[nextIndex]?.focus();
  }
}
