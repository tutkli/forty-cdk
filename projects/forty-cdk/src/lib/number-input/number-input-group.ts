import { computed, Directive, signal } from '@angular/core';

import {
  FOR_NUMBER_INPUT_CONTEXT,
  FOR_NUMBER_INPUT_GROUP,
  type ForNumberInputContext,
  type ForNumberInputRegistry,
} from './number-input-context';

/**
 * Optional coordination wrapper for a `[forNumberInput]` and its
 * `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons. It renders
 * nothing and imposes no role or layout — its only job is to bridge the buttons
 * to the spinbutton.
 *
 * It is required _only_ when you use the stepper buttons: a `<input>` is a void
 * element and can't contain the buttons as DOM descendants, so the buttons
 * can't inject the spinbutton's context directly. The group provides that
 * context and forwards it to the `[forNumberInput]` registered beneath it. A
 * standalone `[forNumberInput]` (keyboard / `[(value)]` only) needs no group.
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
  providers: [
    { provide: FOR_NUMBER_INPUT_CONTEXT, useExisting: ForNumberInputGroup },
    { provide: FOR_NUMBER_INPUT_GROUP, useExisting: ForNumberInputGroup },
  ],
})
export class ForNumberInputGroup implements ForNumberInputContext, ForNumberInputRegistry {
  readonly #field = signal<ForNumberInputContext | null>(null);

  readonly value = computed(() => this.#field()?.value() ?? null);
  readonly disabled = computed(() => this.#field()?.disabled() ?? false);
  readonly readonly = computed(() => this.#field()?.readonly() ?? false);
  readonly atMin = computed(() => this.#field()?.atMin() ?? false);
  readonly atMax = computed(() => this.#field()?.atMax() ?? false);

  increment(by?: number): void {
    this.#field()?.increment(by);
  }

  decrement(by?: number): void {
    this.#field()?.decrement(by);
  }

  register(field: ForNumberInputContext): void {
    this.#field.set(field);
  }

  unregister(field: ForNumberInputContext): void {
    if (this.#field() === field) {
      this.#field.set(null);
    }
  }
}
