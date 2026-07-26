import { Directive, type Signal } from '@angular/core';
import { createSingleSlot } from 'forty-cdk/core';

import {
  FOR_SEARCH_GROUP,
  type ForSearchContext,
  type ForSearchGroupContext,
} from './search-context';

/**
 * Optional coordination wrapper for a `[forSearch]` and its companion
 * `[forSearchClear]` button. It renders nothing and imposes no role or layout —
 * its only job is to bridge the button to the search field.
 *
 * It is required _only_ when you use the clear button: a `<input>` is a void
 * element and can't contain the button as a DOM descendant, so the button can't
 * inject the field's context directly. The group registers the `[forSearch]`
 * beneath it and exposes it via `field()`, which the button reads. A standalone
 * `[forSearch]` (keyboard / `[(value)]` only) needs no group.
 *
 * @example
 * ```html
 * <div forSearchGroup>
 *   <input forSearch [(value)]="query" placeholder="Search…" />
 *   <button forSearchClear ariaLabel="Clear search">×</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[forSearchGroup]',
  exportAs: 'forSearchGroup',
  providers: [{ provide: FOR_SEARCH_GROUP, useExisting: ForSearchGroup }],
})
export class ForSearchGroup implements ForSearchGroupContext {
  readonly #slot = createSingleSlot<ForSearchContext>({
    primitive: 'search',
    owner: '[forSearchGroup]',
    claimant: '[forSearch]',
  });

  /** The registered search field, or `null` while none is mounted. */
  readonly field: Signal<ForSearchContext | null> = this.#slot.value;

  /** Register the search field the group coordinates. */
  register(field: ForSearchContext): void {
    this.#slot.register(field);
  }

  /** Remove a previously registered search field. */
  unregister(field: ForSearchContext): void {
    this.#slot.unregister(field);
  }
}
