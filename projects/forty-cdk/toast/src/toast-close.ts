import { Directive, inject, input } from '@angular/core';

import { hostAriaLabel, hostButtonType, resolveTextInput } from 'forty-cdk/core';
import { injectToastContext } from './toast-context';
import { FOR_TOAST_DEFAULTS } from 'forty-cdk/defaults';

/**
 * Close button inside a toast. Apply on a `<button type="button">` so
 * Space / Enter dispatch a native click. Clicking emits `(dismiss)` from
 * the parent `[forToast]` with reason `'manual'`.
 */
@Directive({
  selector: '[forToastClose]',
  exportAs: 'forToastClose',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '(click)': 'onClick()',
  },
})
export class ForToastClose {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectToastContext('ForToastClose');
  readonly #defaults = inject(FOR_TOAST_DEFAULTS);

  /**
   * Accessible name for the close button, exposed as `aria-label`. Defaults to
   * the scope's `closeAriaLabel` (`'Close'` unless overridden via
   * `provideForToastDefaults`); set `[ariaLabel]` to override per-instance, or
   * `null` to drop the attribute. A static `aria-label` on the host replaces
   * both the default and this input.
   */
  readonly ariaLabel = input<string | null>();

  protected readonly resolvedAriaLabel = hostAriaLabel(
    () => resolveTextInput(this.ariaLabel(), this.#defaults.closeAriaLabel) || null,
  );

  protected onClick(): void {
    this.ctx.requestClose('manual');
  }
}
