import { computed, DestroyRef, Directive, inject } from '@angular/core';
import type { ValidationError } from '@angular/forms/signals';

import { injectFieldContext } from './field-context';

function extractMessage(error: ValidationError.WithOptionalFieldTree): string {
  if ('message' in error && typeof error.message === 'string' && error.message !== '') {
    return error.message;
  }
  return error.kind;
}

/**
 * Error region for a form control. Adopts the field's `errorId`, registers
 * itself so the control gains `aria-errormessage` (and the id is folded into
 * `aria-describedby`) while invalid, and **reads the control's Signal Forms
 * validation errors automatically** — the consumer renders `messages()` (or
 * the raw `errors()`) without any manual plumbing.
 *
 * Carries `role="alert"`. Drive its presence with `@if (err.shown())` (or the
 * field's own `invalid()`); when unmounted the control's `aria-errormessage`
 * drops automatically.
 *
 * @example
 * ```html
 * @if (err.shown()) {
 *   <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
 * }
 * ```
 */
@Directive({
  selector: '[forFieldError]',
  exportAs: 'forFieldError',
  host: {
    '[attr.id]': 'ctx.errorId()',
    role: 'alert',
  },
})
export class ForFieldError {
  protected readonly ctx = injectFieldContext('ForFieldError');

  /** The control's current validation errors (Signal Forms). */
  readonly errors = computed(() => this.ctx.control()?.errors?.() ?? []);

  /** Human-readable messages derived from {@link errors}. */
  readonly messages = computed<readonly string[]>(() =>
    this.errors().map((error) => extractMessage(error)),
  );

  /** Whether the control currently has at least one error. */
  readonly hasErrors = computed(() => this.errors().length > 0);

  /** Whether the error region should be shown (control invalid and has errors). */
  readonly shown = computed(() => this.ctx.invalid() && this.hasErrors());

  constructor() {
    const unregister = this.ctx.registerError();
    inject(DestroyRef).onDestroy(unregister);
  }
}
