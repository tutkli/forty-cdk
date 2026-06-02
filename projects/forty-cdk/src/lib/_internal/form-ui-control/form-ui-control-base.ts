import { booleanAttribute, Directive, input, model } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';

import { injectFieldWiring } from '../field/field-wiring';
import { injectFormControlReflection } from '../form-control-reflection/form-control-reflection';

/**
 * Abstract base for primitives that implement `FormValueControl<T>` or
 * `FormCheckboxControl` from `@angular/forms/signals`. Owns the universal
 * `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` /
 * `name` / `errors` inputs plus the `touched` model so each form-control
 * primitive doesn't redeclare them.
 *
 * Subclasses keep ownership of their value signal — `value: model<T>()` for
 * `FormValueControl<T>` or `checked: model<boolean>()` for
 * `FormCheckboxControl` — and any control-shape-specific members
 * (`min` / `max` / `pattern`, `multiple`, `orientation`, etc.).
 *
 * The base constructor wires `injectFormControlReflection({...})` so each
 * subclass gets `data-touched` / `data-dirty` / `data-pending` /
 * `data-invalid` reflection on its host element automatically — subclasses
 * don't need to opt in.
 *
 * Implemented as an `@Directive()`-decorated abstract class because Angular
 * recognises signal inputs only when `input()` / `model()` calls appear
 * directly in a class-field initializer; a factory function returning the
 * bundle would not be detected by the compiler. Inheritance is the
 * supported mechanism for sharing initializer-API declarations across
 * directives.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
@Directive()
export abstract class FormUiControlBase {
  /** When true, interaction is ignored and `aria-disabled` / `data-disabled` are reflected. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** When true, interaction is ignored but the control stays focusable; `aria-readonly="true"`. */
  readonly readonly = input(false, { transform: booleanAttribute });

  /** Reflected as `aria-required="true"` when truthy. */
  readonly required = input(false, { transform: booleanAttribute });

  /** Reflected as `aria-invalid="true"` and `data-invalid` when truthy. */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Reflected as `aria-busy="true"` and `data-pending` when truthy. */
  readonly pending = input(false, { transform: booleanAttribute });

  /** Reflected as `data-dirty` when truthy. */
  readonly dirty = input(false, { transform: booleanAttribute });

  /** When non-empty, hidden inputs are mounted under that name for native form submission. */
  readonly name = input<string>('');

  /** Validation errors surfaced by Signal Forms. */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /** Set to true on blur. Two-way bindable so Signal Forms can read it. */
  readonly touched = model<boolean>(false);

  constructor() {
    injectFormControlReflection({
      touched: this.touched,
      dirty: this.dirty,
      pending: this.pending,
      invalid: this.invalid,
    });
    injectFieldWiring({
      invalid: this.invalid,
      required: this.required,
      disabled: this.disabled,
      touched: this.touched,
      errors: this.errors,
    });
  }
}
