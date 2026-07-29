import { booleanAttribute, Directive, input, model, type Provider, type Type } from '@angular/core';

import {
  Collection,
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
  injectTextDirection,
} from 'forty-cdk/core';
import {
  ACCORDION_CONTEXT,
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
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: provideForAccordion(ForAccordion),
})
export class ForAccordion implements ForAccordionContext {
  readonly #triggers = new Collection<ForAccordionTriggerHandle>();

  /** When true, multiple items can be expanded simultaneously. */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * When true, the whole accordion is disabled: every item's trigger reflects
   * the native `disabled` attribute (dropped from the Tab order and skipped by
   * arrow-key navigation) and cannot toggle. Composes with a per-item
   * `[disabled]` — an item is effectively disabled when either is set. Mirrors
   * the root `disabled` on `ForTabs` / `ForStepper` / `ForDisclosure`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

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

  private registerTrigger(handle: ForAccordionTriggerHandle): void {
    this.#triggers.register(handle);
  }

  private unregisterTrigger(handle: ForAccordionTriggerHandle): void {
    this.#triggers.unregister(handle);
  }
}

/**
 * The providers a `[forAccordion]` root installs: the public
 * {@link FOR_ACCORDION_CONTEXT}, aliased to `root`, plus the internal
 * coordination token the accordion's pieces resolve.
 *
 * `ForAccordion` declares its own providers through this helper, so a wrapper
 * that **subclasses** the root has a single call to keep in step with it. That
 * matters because Angular does not inherit a directive's `providers`: a subclass
 * carrying its own `@Directive` metadata replaces the array wholesale, so
 * re-providing `FOR_ACCORDION_CONTEXT` alone leaves the internal token absent
 * and every piece orphans with the "must be used inside a [forAccordion]
 * element" error. That token is deliberately unnameable outside the library
 * ([#1399](https://github.com/tutkli/forty-cdk/issues/1399)), which is why the
 * wrapper cannot list it by hand.
 *
 * ```ts
 * providers: provideForAccordion(MyAccordion),
 * ```
 *
 * Wrapping through `hostDirectives: [ForAccordion]` needs none of this — a host
 * directive brings its own providers to the element.
 */
export function provideForAccordion(root: Type<ForAccordion>): Provider[] {
  return [
    { provide: FOR_ACCORDION_CONTEXT, useExisting: root },
    { provide: ACCORDION_CONTEXT, useExisting: root },
  ];
}
