import { computed, type WritableSignal } from '@angular/core';
import type { FieldState, FieldTree } from '@angular/forms/signals';

/**
 * Bridges a single-valued `FieldTree<T | null>` to the array-backed selection
 * primitives (`ForSelect`, `ForListbox`, `ForCombobox`), which implement
 * `FormValueControl<readonly T[]>` per the library's selection value-type
 * contract. It returns a `FieldTree<readonly T[]>` view that the standard
 * `[formField]` directive binds unchanged — no hand-rolled `T | null` ⇄
 * `readonly T[]` mapping, and no re-plumbing of `disabled` / `invalid` /
 * `errors` / `touched` / `required` between the field and the control.
 *
 * The returned tree is a thin, derived view over the original field:
 * - **Value** maps both directions. The field's `T | null` reads as a
 *   `readonly T[]` of length 0 (when `null`) or 1; a write of `[]` clears the
 *   field to `null`, and a write of `[v]` sets it to `v`. In single mode the
 *   array never exceeds one element; should a longer array arrive, the last
 *   entry wins (the most recently selected value).
 * - **Everything else** (`disabled`, `readonly`, `required`, `invalid`,
 *   `errors`, `touched`, `dirty`, `pending`, `name`, validation, touch
 *   tracking, focus) delegates to the original field state, so `[formField]`
 *   pushes the same UI state into the control it would for any other field.
 *
 * Single source of truth: the value view is `computed` from the original
 * field, never mirrored into a separate signal — there is no second copy of
 * the value to drift.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core';
 * import { form } from '@angular/forms/signals';
 * import { ForSelect, ForSelectTrigger, forSingleValueField } from 'forty-cdk';
 *
 * @Component({
 *   imports: [ForSelect, ForSelectTrigger, FormField],
 *   template: `
 *     <div forSelect [formField]="country">
 *       <button forSelectTrigger>…</button>
 *       …
 *     </div>
 *   `,
 * })
 * export class CountryPicker {
 *   private readonly model = signal({ country: null as string | null });
 *   private readonly profile = form(this.model);
 *
 *   // Bind the single-valued field to the array-backed control.
 *   protected readonly country = forSingleValueField(this.profile.country);
 * }
 * ```
 *
 * @param field The single-valued field tree to adapt, modeled as `T | null`.
 * @returns A `FieldTree<readonly T[]>` view that binds to the selection
 *   primitives through `[formField]`.
 */
export function forSingleValueField<T>(field: FieldTree<T | null>): FieldTree<readonly T[]> {
  const empty: readonly T[] = [];

  const arrayView = (source: () => WritableSignal<T | null>): WritableSignal<readonly T[]> => {
    const read = computed<readonly T[]>(() => {
      const value = source()();
      return value == null ? empty : [value];
    });
    const view = read as unknown as WritableSignal<readonly T[]>;
    view.set = (next: readonly T[]): void => {
      source().set(next.length > 0 ? next[next.length - 1]! : null);
    };
    view.update = (updater: (prev: readonly T[]) => readonly T[]): void =>
      view.set(updater(read()));
    view.asReadonly = () => read;
    return view;
  };

  const controlValue = arrayView(() => field().controlValue);
  const value = arrayView(() => field().value);

  const state = new Proxy({} as FieldState<readonly T[]>, {
    get(_target, property) {
      if (property === 'controlValue') {
        return controlValue;
      }
      if (property === 'value') {
        return value;
      }
      const real = field() as unknown as Record<string | symbol, unknown>;
      const member = real[property];
      return typeof member === 'function'
        ? (member as (...args: unknown[]) => unknown).bind(real)
        : member;
    },
  });

  return (() => state) as unknown as FieldTree<readonly T[]>;
}
