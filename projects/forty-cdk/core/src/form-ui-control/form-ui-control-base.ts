import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';

import { FOR_FIELDSET_CONTEXT } from '../field/fieldset-context';
import { injectFieldWiring } from '../field/field-wiring';

/**
 * Abstract base for primitives that implement `FormValueControl<T>` or
 * `FormCheckboxControl` from `@angular/forms/signals`. Owns the universal
 * `disabled` / `readonly` / `required` / `invalid` / `pending` / `dirty` /
 * `name` / `errors` inputs plus the `touched` model and `touch` output so each
 * form-control primitive doesn't redeclare them.
 *
 * Subclasses keep ownership of their value signal — `value: model<T>()` for
 * `FormValueControl<T>` or `checked: model<boolean>()` for
 * `FormCheckboxControl` — and any control-shape-specific members
 * (`min` / `max` / `pattern`, `multiple`, `orientation`, etc.).
 *
 * The base constructor reflects the four form-state booleans (`touched` /
 * `dirty` / `pending` / `invalid`) as boolean `data-*` attributes on each
 * subclass's host element automatically — subclasses don't need to opt in.
 * Imperative `toggleAttribute` writes (present with empty string when truthy,
 * absent otherwise) keep the subclass's declarative `host: { ... }` block free
 * of these attributes; no conflict because they aren't bound elsewhere.
 *
 * Implemented as an `@Directive()`-decorated abstract class because Angular
 * recognises signal inputs only when `input()` / `model()` calls appear
 * directly in a class-field initializer; a factory function returning the
 * bundle would not be detected by the compiler. Inheritance is the
 * supported mechanism for sharing initializer-API declarations across
 * directives.
 *
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
 */
@Directive()
export abstract class FormUiControlBase {
  /**
   * Consumer/Signal-Forms `disabled` input. Subclasses gate behavior and reflect
   * ARIA/`data-*` off {@link effectiveDisabled}, not this raw input, so a
   * surrounding disabled `[forFieldset]` also disables the control. Bind to this
   * via `[disabled]` or `[formField]`; read {@link effectiveDisabled} for state.
   */
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

  /**
   * Set to true on blur (via {@link markTouched}). Two-way bindable for
   * standalone consumers; under `[formField]` the directive pushes the field's
   * touched state down through this input, so the form stays the source of
   * truth (e.g. a form reset clears it).
   */
  readonly touched = model<boolean>(false);

  /**
   * Emitted on every touch-producing interaction (blur, dismiss,
   * selection-commit) — including repeats once the control is already touched.
   * The {@link touched} model itself only changes on the first, and Signal
   * Forms' `markAsTouched()` is idempotent, so re-emission is safe. No control
   * once-guards this. `[formField]` listens to this output to mark the field
   * touched — since Signal Forms v22 the `touched` input is write-only from the
   * form's perspective and never read back.
   */
  readonly touch = output<void>();

  /**
   * Moves focus into the control, mirroring the optional `FormUiControl.focus`
   * from `@angular/forms/signals`. Declared here without an implementation —
   * the base has no idea where a subclass's focus entry point is — so that a
   * surrounding `[forField]` can be handed the subclass's own `focus()` for
   * label-click activation whenever one exists. A subclass whose host is
   * itself focusable declares nothing and the field focuses that host.
   *
   * A subclass must declare this as a **method**, not an arrow-valued field:
   * the base reads it during `super()`, before subclass fields initialize.
   */
  focus?(options?: FocusOptions): void;

  readonly #fieldset = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  /**
   * The control's own {@link disabled} OR'd with a surrounding disabled
   * `[forFieldset]`. This is the value that gates interaction and drives
   * `aria-disabled` / `data-disabled` — a native `<fieldset disabled>` does not
   * reach custom-role controls (`forSwitch`, `forCheckbox`, …), so the group's
   * disabled state must compose in here. Subclasses read this, never the raw
   * {@link disabled} input.
   */
  readonly effectiveDisabled = computed(
    () => this.disabled() || (this.#fieldset?.disabled() ?? false),
  );

  readonly #hostEl = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * The focusable element a surrounding `[forField]` should target for
   * `aria-*` association and focus. Defaults to the directive host — correct
   * when the host IS the control (Listbox, native `<input>`). Override when the
   * host is a non-interactive wrapper and the real control is a child (the
   * Select trigger button / the Combobox `role="combobox"` input), returning
   * that element — or `null` while it hasn't registered yet, in which case the
   * field defers wiring rather than targeting the wrapper.
   *
   * Read lazily inside the field-wiring effect, so a subclass override may
   * reference its own signals (initialized after this base `super()` runs).
   */
  protected fieldLabelledElement(): HTMLElement | null {
    return this.#hostEl;
  }

  /**
   * The id already host-bound on {@link fieldLabelledElement} when a subclass
   * nominates a child control (e.g. the Select trigger's `triggerId`). The
   * field adopts it as its `controlId` so the label's `for` and the primitive's
   * internal `aria-labelledby` point at the same element. `null` (the default,
   * and the host-is-the-control case) falls back to the field's owned id.
   */
  protected fieldLabelledElementId(): string | null {
    return null;
  }

  /**
   * Marks the control touched: flips the {@link touched} model (standalone
   * reflection) and emits {@link touch} (Signal Forms integration). Subclasses
   * call this from every touch-producing interaction instead of writing
   * `touched` directly, so both channels always fire together.
   * Never once-guard this in a subclass: the emission cadence is part of the
   * uniform form-control contract.
   */
  protected markTouched(): void {
    this.touched.set(true);
    this.touch.emit();
  }

  /**
   * The element the four form-state `data-*` booleans (`data-touched` /
   * `data-dirty` / `data-pending` / `data-invalid`) are reflected onto. Defaults
   * to the directive host — correct when the host carries the control's styling
   * surface. Override (returning `null` until it exists) when the reflected
   * element is a child the directive injects, e.g. `ForOtpInput`'s real
   * `<input>` rather than its `role="group"` host. Read reactively inside the
   * reflection effect, so a returned signal re-targets once the element appears.
   */
  protected fieldStateReflectionTarget(): HTMLElement | null {
    return this.#hostEl;
  }

  /**
   * The control's effective invalidity — reflected as `data-invalid` and fed to
   * a surrounding `[forField]` (which gates its error region and folds the error
   * id into `aria-describedby`). Defaults to the raw {@link invalid} input.
   * Override to fold in invalidity the form itself can't express (e.g.
   * `ForDateRangeField` / `ForTimeRangeField` treating an out-of-order range as
   * invalid) so `aria-invalid`, `data-invalid`, and the field wiring stay
   * consistent. Read reactively inside the reflection and field-wiring effects,
   * so an override may reference its own signals (initialized after this base
   * `super()` runs).
   */
  protected effectiveInvalid(): boolean {
    return this.invalid();
  }

  constructor() {
    effect(() => {
      const target = this.fieldStateReflectionTarget();
      if (!target) {
        return;
      }
      target.toggleAttribute('data-touched', this.touched());
      target.toggleAttribute('data-dirty', this.dirty());
      target.toggleAttribute('data-pending', this.pending());
      target.toggleAttribute('data-invalid', this.effectiveInvalid());
    });
    injectFieldWiring({
      invalid: computed(() => this.effectiveInvalid()),
      required: this.required,
      disabled: this.effectiveDisabled,
      touched: this.touched,
      errors: this.errors,
      labelledElement: computed(() => this.fieldLabelledElement()),
      labelledElementId: computed(() => this.fieldLabelledElementId() ?? undefined),
      focus: this.focus?.bind(this),
    });
  }
}
