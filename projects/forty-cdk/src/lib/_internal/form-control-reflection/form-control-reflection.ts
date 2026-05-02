import { effect, ElementRef, inject, type Signal } from '@angular/core';

export interface FormControlReflectionConfig {
  /** Reflected as `data-touched` while truthy. */
  touched?: Signal<boolean>;
  /** Reflected as `data-dirty` while truthy. */
  dirty?: Signal<boolean>;
  /** Reflected as `data-pending` while truthy. */
  pending?: Signal<boolean>;
  /** Reflected as `data-invalid` while truthy. */
  invalid?: Signal<boolean>;
}

/**
 * Reflects the four form-state booleans (`touched`, `dirty`, `pending`,
 * `invalid`) as boolean `data-*` attributes on the directive's host
 * element, following the cross-primitive convention: present with empty
 * string when truthy, absent otherwise.
 *
 * Imperative DOM writes (via `toggleAttribute`) so the primitive's existing
 * `host: { ... }` block stays declarative for the rest of its bindings; no
 * conflict because `data-touched` / `data-dirty` / `data-pending` /
 * `data-invalid` aren't bound elsewhere.
 *
 * Pair with the `FormValueControl` / `FormCheckboxControl` interface inputs
 * already on the primitive — the four signals here are usually `input(...)`
 * or `model(...)` declared by the host directive.
 */
export function injectFormControlReflection(config: FormControlReflectionConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;

  effect(() => {
    if (config.touched) {
      el.toggleAttribute('data-touched', config.touched());
    }
    if (config.dirty) {
      el.toggleAttribute('data-dirty', config.dirty());
    }
    if (config.pending) {
      el.toggleAttribute('data-pending', config.pending());
    }
    if (config.invalid) {
      el.toggleAttribute('data-invalid', config.invalid());
    }
  });
}
