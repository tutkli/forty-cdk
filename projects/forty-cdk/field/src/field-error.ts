import { computed, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
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
 * the raw `errors()`) without any manual plumbing. A consumer-set static `id`
 * is kept and becomes the field's `errorId`.
 *
 * Carries `role="alert"`. Gate its mount on the field's `invalid()` (exposed via
 * the `[forField]` export, or the bound Signal Forms field) — a template
 * reference to this directive is block-scoped to the `@if` body, so it cannot
 * appear in the condition that mounts it. When unmounted the control's
 * `aria-errormessage` drops automatically.
 *
 * @example
 * ```html
 * <div forField #field="forField">
 *   <!-- label / control / description … -->
 *   @if (field.invalid()) {
 *     <p forFieldError #err="forFieldError">{{ err.messages().join(', ') }}</p>
 *   }
 * </div>
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
  private readonly ctx = injectFieldContext('ForFieldError');

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
    const unregister = this.ctx.registerError(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
    );
    inject(DestroyRef).onDestroy(unregister);
  }
}
