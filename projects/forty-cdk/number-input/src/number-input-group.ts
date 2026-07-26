import { Directive, type Signal } from '@angular/core';
import { createSingleSlot } from 'forty-cdk/core';

import {
  FOR_NUMBER_INPUT_GROUP,
  type ForNumberInputContext,
  type ForNumberInputGroupContext,
} from './number-input-context';

/**
 * Optional coordination wrapper for a `[forNumberInput]` and its
 * `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons. It renders
 * nothing and imposes no role or layout — its only job is to bridge the buttons
 * to the spinbutton.
 *
 * It is required _only_ when you use the stepper buttons: a `<input>` is a void
 * element and can't contain the buttons as DOM descendants, so the buttons
 * can't inject the spinbutton's context directly. The group registers the
 * `[forNumberInput]` beneath it and exposes it via `field()`, which the buttons
 * read. A standalone `[forNumberInput]` (keyboard / `[(value)]` only) needs no
 * group.
 *
 * @example
 * ```html
 * <div forNumberInputGroup>
 *   <button forNumberInputDecrement aria-label="Decrease">−</button>
 *   <input forNumberInput [(value)]="qty" [min]="0" [max]="10" />
 *   <button forNumberInputIncrement aria-label="Increase">+</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[forNumberInputGroup]',
  exportAs: 'forNumberInputGroup',
  providers: [{ provide: FOR_NUMBER_INPUT_GROUP, useExisting: ForNumberInputGroup }],
})
export class ForNumberInputGroup implements ForNumberInputGroupContext {
  readonly #slot = createSingleSlot<ForNumberInputContext>({
    primitive: 'number-input',
    owner: '[forNumberInputGroup]',
    claimant: '[forNumberInput]',
  });

  /** The registered spinbutton field, or `null` while none is mounted. */
  readonly field: Signal<ForNumberInputContext | null> = this.#slot.value;

  /** Register the spinbutton field the group coordinates. */
  register(field: ForNumberInputContext): void {
    this.#slot.register(field);
  }

  /** Remove a previously registered spinbutton field. */
  unregister(field: ForNumberInputContext): void {
    this.#slot.unregister(field);
  }
}
