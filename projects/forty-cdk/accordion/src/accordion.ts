import { booleanAttribute, Directive, input, model } from '@angular/core';

import {
  Collection,
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
  injectTextDirection,
} from 'forty-cdk/core';
import {
  FOR_ACCORDION_CONTEXT,
  type ForAccordionContext,
  type ForAccordionTriggerHandle,
} from './accordion-context';

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
    '[attr.data-orientation]': 'orientation()',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_ACCORDION_CONTEXT, useExisting: ForAccordion }],
})
export class ForAccordion implements ForAccordionContext {
  readonly #triggers = new Collection<ForAccordionTriggerHandle>();

  /** When true, multiple items can be expanded simultaneously. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Single mode only: when true, the open item can be collapsed by clicking
   * its trigger. When false, exactly one item stays open at all times once
   * any has been opened.
   */
  readonly collapsible = input(false, { transform: booleanAttribute });

  /**
   * Layout direction of the trigger list. `'vertical'` (default) maps
   * ArrowUp/Down to prev/next; `'horizontal'` maps ArrowLeft/Right (with RTL
   * swap when `dir='rtl'`).
   */
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');

  /**
   * Writing direction. Only relevant when `orientation='horizontal'`. When
   * unset (default `null`), the inherited ambient direction is resolved from
   * the nearest ancestor carrying a `dir` attribute (or `<html dir>`),
   * defaulting to `'ltr'`. An explicit `[dir]` always wins. The resolved
   * value is reflected to the host `dir` attribute and drives arrow-key
   * semantics.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * When true (default), arrow navigation between triggers wraps at the ends —
   * moving past the last trigger focuses the first and vice versa. Set `false`
   * to stop at the boundaries. Mirrors the `loop` input on `ForTabs` and
   * `ForListbox`.
   */
  readonly loop = input(true, { transform: booleanAttribute });

  /**
   * Two-way bindable. List of currently expanded item values. In single
   * mode the array has 0 or 1 element. The `model()` change emitter
   * (`(valueChange)`) fires only on internal toggles, never on consumer
   * writes via `[(value)]` — observe transitions without binding back.
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

  focusByOffset(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    const triggers = this.#triggers.items();
    if (triggers.length === 0) {
      return;
    }
    const currentIndex = triggers.findIndex((t) => t.host === currentTrigger);
    if (currentIndex === -1 && action !== 'first' && action !== 'last') {
      return;
    }
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, triggers.length, action, {
      loop: this.loop(),
      isDisabled: (i) => triggers[i]?.disabled() ?? false,
    });
    if (next !== null) {
      triggers[next]?.host.focus();
    }
  }

  registerTrigger(handle: ForAccordionTriggerHandle): void {
    this.#triggers.register(handle);
  }

  unregisterTrigger(handle: ForAccordionTriggerHandle): void {
    this.#triggers.unregister(handle);
  }
}
