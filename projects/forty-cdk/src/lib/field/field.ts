import { computed, Directive, inject, signal } from '@angular/core';

import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import { FOR_FIELDSET_CONTEXT } from '../fieldset/fieldset-context';
import { FOR_FIELD_CONTEXT, type FieldControlHandle, type ForFieldContext } from './field-context';

/**
 * Headless form-field container that wires accessible labelling, description,
 * and error association for a single control — the styleless counterpart to
 * Radix `Label` + `Form` / Base UI `Field`. It renders nothing and imposes no
 * layout: its only job is to connect a `[forLabel]`, `[forFieldDescription]`,
 * and `[forFieldError]` to the control via `id` / `aria-labelledby` /
 * `aria-describedby` / `aria-errormessage`, and to reflect the control's
 * validation state as `data-*` hooks for styling.
 *
 * Any forty-cdk form control (every `FormValueControl` / `FormCheckboxControl`
 * primitive) auto-associates when wrapped — no extra markup. A plain native
 * `<input>` opts in with `[forFieldControl]`.
 *
 * Host reflects `data-invalid` / `data-disabled` / `data-required` /
 * `data-touched` from the registered control.
 *
 * @example
 * ```html
 * <div forField>
 *   <label forLabel>Notifications</label>
 *   <button forSwitch [formField]="settings.notify"></button>
 *   <p forFieldDescription>We'll only email you about security.</p>
 *   @if (settings.notify().invalid()) {
 *     <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
 *   }
 * </div>
 * ```
 */
@Directive({
  selector: '[forField]',
  exportAs: 'forField',
  host: {
    '[attr.data-invalid]': 'invalid() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.data-required]': 'required() ? "" : null',
    '[attr.data-touched]': 'touched() ? "" : null',
  },
  providers: [{ provide: FOR_FIELD_CONTEXT, useExisting: ForField }],
})
export class ForField implements ForFieldContext {
  readonly #idGen = inject(IdGenerator);
  readonly #fieldset = inject(FOR_FIELDSET_CONTEXT, { optional: true });

  readonly #controlId = signal(this.#idGen.next('for-field-control'));
  readonly #control = signal<FieldControlHandle | null>(null);
  readonly #hasLabel = signal(false);
  readonly #hasDescription = signal(false);
  readonly #hasError = signal(false);

  /**
   * The element the field actually targets for `id` / `aria-*` association and
   * focus: the control's nominated `labelledElement` (Select trigger / Combobox
   * input) when present, else its host (Listbox, native `<input>`).
   */
  readonly #targetEl = computed<HTMLElement | null>(() => {
    const control = this.#control();
    if (!control) {
      return null;
    }
    return control.labelledElement?.() ?? control.host;
  });

  /**
   * Id assigned to the control; a label's `for` points here. Adopts a
   * nominated control's own id (`labelledElementId`) when present so the label
   * and the primitive's internal `aria-labelledby` resolve to the same
   * focusable element; otherwise the field's owned/host-adopted id.
   */
  readonly controlId = computed(() => this.#control()?.labelledElementId?.() ?? this.#controlId());
  /** Id of the label element. */
  readonly labelId = signal(this.#idGen.next('for-field-label'));
  /** Id of the description element. */
  readonly descriptionId = signal(this.#idGen.next('for-field-description'));
  /** Id of the error element. */
  readonly errorId = signal(this.#idGen.next('for-field-error'));
  /** The currently registered control handle, or null. */
  readonly control = this.#control.asReadonly();

  /** Whether the registered control is currently invalid. */
  readonly invalid = computed(() => this.#control()?.invalid?.() ?? false);
  /** Whether the registered control is required. */
  readonly required = computed(() => this.#control()?.required?.() ?? false);
  /**
   * Whether the field is disabled: the registered control's own disabled state
   * OR'd with a surrounding `[forFieldset]`'s `disabled` (so a disabled group
   * reaches custom-role controls a native `<fieldset disabled>` can't).
   */
  readonly disabled = computed(
    () => (this.#control()?.disabled?.() ?? false) || (this.#fieldset?.disabled() ?? false),
  );
  /** Whether the registered control has been touched. */
  readonly touched = computed(() => this.#control()?.touched?.() ?? false);

  /** Resolved `aria-labelledby` for the control (label id, or null). */
  readonly labelledBy = computed(() => (this.#hasLabel() ? this.labelId() : null));

  /**
   * Resolved `aria-describedby`: the description id always, plus the error id
   * when the control is invalid. The error id is included here (in addition to
   * `aria-errormessage`) because assistive-tech support for `aria-errormessage`
   * is uneven; doubling it up is the widely-used robust pattern.
   */
  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.#hasDescription()) {
      ids.push(this.descriptionId());
    }
    if (this.#hasError() && this.invalid()) {
      ids.push(this.errorId());
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /** Resolved `aria-errormessage`: the error id when present and invalid, else null. */
  readonly errorMessageId = computed(() =>
    this.#hasError() && this.invalid() ? this.errorId() : null,
  );

  /** Register the control whose state the field reflects. */
  registerControl(handle: FieldControlHandle): void {
    this.#control.set(handle);
    // Adopt a consumer-set id on the host (the host-is-the-control case). When
    // the control nominates a distinct labelled element it carries its own
    // `labelledElementId`, which `controlId` prefers — so a wrapper-host id, if
    // any, is harmlessly ignored there.
    adoptHostId(handle.host, this.#controlId);
  }

  /** Remove a previously registered control. */
  unregisterControl(handle: FieldControlHandle): void {
    if (this.#control() === handle) {
      this.#control.set(null);
    }
  }

  /**
   * Mark the label slot present; returns an unregister callback. The field
   * targets a single label per slot — its `labelId` / `descriptionId` /
   * `errorId` are single ids, not id lists — so one `[forLabel]`,
   * `[forFieldDescription]`, and `[forFieldError]` per field is the supported
   * shape. Presence is a boolean, not a count.
   */
  registerLabel(): () => void {
    this.#hasLabel.set(true);
    return () => this.#hasLabel.set(false);
  }

  /** Mark the description slot present; returns an unregister callback. See {@link registerLabel} for the single-instance-per-slot contract. */
  registerDescription(): () => void {
    this.#hasDescription.set(true);
    return () => this.#hasDescription.set(false);
  }

  /** Mark the error slot present; returns an unregister callback. See {@link registerLabel} for the single-instance-per-slot contract. */
  registerError(): () => void {
    this.#hasError.set(true);
    return () => this.#hasError.set(false);
  }

  /**
   * Forward a click to the control's focusable element and focus it — matching
   * the activation a native `<label for>` triggers via the browser, so a
   * non-`<label>` `[forLabel]` toggles a custom-role control instead of only
   * focusing it.
   */
  clickControl(): void {
    const target = this.#targetEl();
    if (!target) {
      return;
    }
    target.click();
    target.focus();
  }
}
