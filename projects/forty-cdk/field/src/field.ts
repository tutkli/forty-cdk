import { computed, Directive, effect, inject, isDevMode, type Signal, signal } from '@angular/core';

import { adoptHostId, IdGenerator, FOR_FIELDSET_CONTEXT } from 'forty-cdk/core';
import { FOR_FIELD_CONTEXT, type FieldControlHandle, type ForFieldContext } from './field-context';

/**
 * Headless form-field container that wires accessible labelling, description,
 * and error association for a single control. It renders nothing and imposes no
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
  readonly #controls = signal<readonly FieldControlHandle[]>([]);
  readonly #controlCount = computed(() => this.#controls().length);
  readonly #control = computed<FieldControlHandle | null>(() => this.#controls().at(-1) ?? null);
  readonly #labelCount = signal(0);
  readonly #descriptionCount = signal(0);
  readonly #errorCount = signal(0);

  constructor() {
    if (isDevMode()) {
      this.#warnOnDuplicateSlot(this.#controlCount, 'control', 'controlId');
      this.#warnOnDuplicateSlot(this.#labelCount, '[forLabel]', 'labelId');
      this.#warnOnDuplicateSlot(this.#descriptionCount, '[forFieldDescription]', 'descriptionId');
      this.#warnOnDuplicateSlot(this.#errorCount, '[forFieldError]', 'errorId');
    }
  }

  /**
   * The element the field actually targets for `id` / `aria-*` association:
   * the control's nominated `labelledElement` (Select trigger / Combobox
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
  /**
   * The currently registered control handle, or null. A `[forField]` targets a
   * single control; if several register, the last one wins and unregistering it
   * falls back to the previous still-mounted one (mirroring the counted label /
   * description / error slots). A duplicate emits a dev-mode warning.
   */
  readonly control = this.#control;

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
  readonly labelledBy = computed(() => (this.#labelCount() > 0 ? this.labelId() : null));

  /**
   * Resolved `aria-describedby`: the description id always, plus the error id
   * when the control is invalid. The error id is included here (in addition to
   * `aria-errormessage`) because assistive-tech support for `aria-errormessage`
   * is uneven; doubling it up is the widely-used robust pattern.
   */
  readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.#descriptionCount() > 0) {
      ids.push(this.descriptionId());
    }
    if (this.#errorCount() > 0 && this.invalid()) {
      ids.push(this.errorId());
    }
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /** Resolved `aria-errormessage`: the error id when present and invalid, else null. */
  readonly errorMessageId = computed(() =>
    this.#errorCount() > 0 && this.invalid() ? this.errorId() : null,
  );

  /**
   * Register the control whose state the field reflects. The field targets a
   * single control — its `controlId` is one id, not an id list — so one control
   * per `[forField]` is the supported shape; group several controls under a
   * `[forFieldset]` instead. Registrations are tracked (mirroring the label /
   * description / error slots), so unmounting one of several accidental
   * duplicates never drops the association while another is still mounted; a
   * duplicate emits a dev-mode warning.
   */
  registerControl(handle: FieldControlHandle): void {
    this.#controls.update((controls) => [...controls, handle]);
    // Adopt a consumer-set id on the host (the host-is-the-control case). When
    // the control nominates a distinct labelled element it carries its own
    // `labelledElementId`, which `controlId` prefers — so a wrapper-host id, if
    // any, is harmlessly ignored there.
    adoptHostId(handle.host, this.#controlId);
  }

  /** Remove a previously registered control. */
  unregisterControl(handle: FieldControlHandle): void {
    this.#controls.update((controls) => controls.filter((c) => c !== handle));
  }

  /**
   * Register the label slot; returns an unregister callback. The field targets
   * a single label per slot — its `labelId` / `descriptionId` / `errorId` are
   * single ids, not id lists — so one `[forLabel]`, `[forFieldDescription]`,
   * and `[forFieldError]` per field is the supported shape. Registrations are
   * counted (mirroring `ForFieldset`'s legend counting), so unmounting one of
   * several accidental duplicates never drops the association while another is
   * still mounted; a duplicate emits a dev-mode warning.
   */
  registerLabel(): () => void {
    this.#labelCount.update((n) => n + 1);
    return () => this.#labelCount.update((n) => n - 1);
  }

  /** Register the description slot; returns an unregister callback. See {@link registerLabel} for the counted single-instance-per-slot contract. */
  registerDescription(): () => void {
    this.#descriptionCount.update((n) => n + 1);
    return () => this.#descriptionCount.update((n) => n - 1);
  }

  /** Register the error slot; returns an unregister callback. See {@link registerLabel} for the counted single-instance-per-slot contract. */
  registerError(): () => void {
    this.#errorCount.update((n) => n + 1);
    return () => this.#errorCount.update((n) => n - 1);
  }

  /**
   * Dev-mode diagnostic: warn when more than one directive claims a slot that
   * maps to a single shared id, which would produce duplicate DOM ids and
   * unstable aria wiring. Sibling of the core `createSingleSlot` warning, in
   * the same `[forty-cdk/<primitive>] A <owner> … a single <claimant>, but N
   * are registered` shape.
   *
   * Evaluated from an `effect` rather than inline in the `register…` call so it
   * reads the *settled* count for the change-detection pass: a structural swap
   * that mounts the replacement before destroying the outgoing piece (two
   * sibling `@if` blocks under one field) is not a duplicate and must not warn.
   * Only ever created in dev mode.
   */
  #warnOnDuplicateSlot(count: Signal<number>, slot: string, idName: string): void {
    effect(() => {
      const registered = count();
      if (registered > 1) {
        console.warn(
          `[forty-cdk/field] A [forField] supports a single ${slot}, but ${registered} are registered. ` +
            `They share one ${idName}, producing duplicate DOM ids and unstable aria wiring — keep one per field.`,
        );
      }
    });
  }

  /**
   * Forward a click to the control and move focus into it — matching the
   * activation a native `<label for>` triggers via the browser, so a
   * `[forLabel]` the browser will not forward for toggles a custom-role control
   * instead of only focusing it.
   *
   * Focus prefers the control's own {@link FieldControlHandle.focus} entry
   * point over the association target, because the two diverge on a composite:
   * the `role="group"` a segmented date / time field is named on takes no
   * focus, while its `focus()` lands on the first editable segment (and no-ops
   * while disabled).
   */
  clickControl(): void {
    const control = this.#control();
    const target = this.#targetEl();
    if (!target) {
      return;
    }
    target.click();
    if (control?.focus) {
      control.focus();
      return;
    }
    target.focus();
  }
}
