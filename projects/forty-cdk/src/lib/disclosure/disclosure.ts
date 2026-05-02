import { booleanAttribute, Directive, inject, input, model, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator';
import { FOR_DISCLOSURE_CONTEXT, ForDisclosureContext } from './disclosure-context';

/**
 * Root of the Disclosure primitive. Holds the open/disabled state and
 * the IDs that wire the trigger to its content.
 *
 * Implements the [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
 *
 * Compose it on any wrapper element with `[forDisclosureTrigger]` and
 * `[forDisclosureContent]` as descendants.
 *
 * @example
 * ```html
 * <div forDisclosure [(open)]="isOpen">
 *   <button type="button" forDisclosureTrigger>Toggle</button>
 *   <div forDisclosureContent>...</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forDisclosure]',
  exportAs: 'forDisclosure',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_DISCLOSURE_CONTEXT, useExisting: ForDisclosure }],
})
export class ForDisclosure implements ForDisclosureContext {
  readonly #idGen = inject(IdGenerator);

  /**
   * Two-way bindable open state. Use `[(open)]` for both read & write, or
   * `(openChange)` alone to observe transitions when the directive itself
   * toggles state (trigger click). The `model()` change emitter does NOT fire
   * for consumer-driven writes via `[(open)]`, so subscribing to
   * `(openChange)` is safe and only sees internal transitions.
   */
  readonly open = model<boolean>(false);

  /** When true, click on the trigger is ignored and `data-disabled` is reflected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly triggerId = signal(this.#idGen.next('for-disclosure-trigger'));
  readonly contentId = signal(this.#idGen.next('for-disclosure-content'));

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.open.set(!this.open());
  }
}
