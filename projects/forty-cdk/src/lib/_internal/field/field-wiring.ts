import {
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  type Signal,
} from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';

/**
 * A form control's contribution to its surrounding `[forField]`. The control
 * exposes the signals the field needs to reflect state (`data-invalid` etc.)
 * and to gate the error region; `host` is the wiring target for `id` and the
 * `aria-*` association attributes.
 *
 * Lives in `_internal/` (not in `lib/field/`) so `FormUiControlBase` can wire
 * itself to a field without statically importing the field directives — that
 * would defeat tree-shaking (importing one form control would pull in the
 * whole `field` primitive) and invert the `lib → _internal` layering.
 */
export interface FieldControlHandle {
  /** The control's host element — target of `id` / `aria-*` wiring. */
  readonly host: HTMLElement;
  /** Reflected by the field as `data-invalid` and gates the error region. */
  readonly invalid?: Signal<boolean>;
  /** Reflected by the field as `data-required`. */
  readonly required?: Signal<boolean>;
  /** Reflected by the field as `data-disabled`. */
  readonly disabled?: Signal<boolean>;
  /** Reflected by the field as `data-touched`. */
  readonly touched?: Signal<boolean>;
  /** Validation errors surfaced by Signal Forms; read by `ForFieldError`. */
  readonly errors?: Signal<readonly ValidationError.WithOptionalFieldTree[]>;
}

/**
 * Coordination contract owned by the `ForField` root. The label, description,
 * and error pieces register with it and read the generated ids; the control
 * (via `injectFieldWiring`) registers its handle and consumes the resolved
 * `aria-*` ids.
 */
export interface ForFieldContext {
  /** Id assigned to the control (a label's `for` points here). */
  readonly controlId: Signal<string>;
  /** Id of the label element. */
  readonly labelId: Signal<string>;
  /** Id of the description element. */
  readonly descriptionId: Signal<string>;
  /** Id of the error element. */
  readonly errorId: Signal<string>;
  /** Resolved `aria-labelledby` for the control (label id, or null). */
  readonly labelledBy: Signal<string | null>;
  /** Resolved `aria-describedby` (description id, plus error id when invalid). */
  readonly describedBy: Signal<string | null>;
  /** Resolved `aria-errormessage` (error id when present and invalid, else null). */
  readonly errorMessageId: Signal<string | null>;
  /** Whether the registered control is currently invalid. */
  readonly invalid: Signal<boolean>;
  /** Whether the registered control is required. */
  readonly required: Signal<boolean>;
  /** Whether the registered control is disabled. */
  readonly disabled: Signal<boolean>;
  /** Whether the registered control has been touched. */
  readonly touched: Signal<boolean>;
  /** The currently registered control handle, or null. */
  readonly control: Signal<FieldControlHandle | null>;
  /** Register the control whose state the field reflects. */
  registerControl(handle: FieldControlHandle): void;
  /** Remove a previously registered control. */
  unregisterControl(handle: FieldControlHandle): void;
  /** Mark a label present; returns an unregister callback. */
  registerLabel(): () => void;
  /** Mark a description present; returns an unregister callback. */
  registerDescription(): () => void;
  /** Mark an error region present; returns an unregister callback. */
  registerError(): () => void;
  /** Move focus to the registered control's host. */
  focusControl(): void;
}

/** Injection token for the surrounding `ForField` coordination contract. */
export const FOR_FIELD_CONTEXT = new InjectionToken<ForFieldContext>('FOR_FIELD_CONTEXT');

function applyAttr(el: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
}

/**
 * Wires the calling directive's host element to a surrounding `[forField]`,
 * if one exists. When there is no ancestor field this is a near-zero-cost
 * no-op (a single optional DI lookup), so every `FormUiControlBase` subclass
 * can call it unconditionally and gain field support for free.
 *
 * When a field is present it:
 * - registers the control handle so the field can reflect `data-*` state,
 *   gate its error region, and focus the control on label click;
 * - reflects `id` (only if the host has none — the field owns the id a label's
 *   `for` points at), `aria-labelledby`, `aria-describedby`, and
 *   `aria-errormessage` on the host, kept in sync via a single `effect`.
 *
 * Imperative DOM writes (mirroring `injectFormControlReflection`) so the
 * caller's declarative `host: { ... }` block stays free of these attributes.
 *
 * @param handle The control's state signals (all optional). `host` is filled
 *   in from the calling directive's `ElementRef`.
 */
export function injectFieldWiring(handle: Omit<FieldControlHandle, 'host'> = {}): void {
  const field = inject(FOR_FIELD_CONTEXT, { optional: true });
  if (!field) {
    return;
  }

  const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const fullHandle: FieldControlHandle = { host: el, ...handle };
  field.registerControl(fullHandle);
  inject(DestroyRef).onDestroy(() => field.unregisterControl(fullHandle));

  effect(() => {
    if (!el.getAttribute('id')) {
      el.setAttribute('id', field.controlId());
    }
    applyAttr(el, 'aria-labelledby', field.labelledBy());
    applyAttr(el, 'aria-describedby', field.describedBy());
    applyAttr(el, 'aria-errormessage', field.errorMessageId());
  });
}
