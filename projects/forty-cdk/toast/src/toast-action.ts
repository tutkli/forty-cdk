import { DestroyRef, Directive, inject, input } from '@angular/core';

import { hostButtonType, registerHandle } from 'forty-cdk/core';
import { injectToastContext } from './toast-context';

/**
 * Action button inside a toast (e.g. "Undo"). Apply on a
 * `<button type="button">` so Space / Enter dispatch a native click.
 *
 * Clicking emits `(dismiss)` from the parent `[forToast]` with reason
 * `'action'`. Wire your action handler with `(click)` on this element
 * itself: the close is requested after every `(click)` handler bound on the
 * element has run, so the handler sees the toast still open and can attach a
 * result with `ref.dismiss('action', result)` or patch it with `ref.update()`.
 *
 * The action is the **sanctioned dismissal path even when the toast is
 * `dismissible=false`**: a forced-action toast suppresses Escape / swipe / the
 * close button but keeps the action button live so the user always has a way
 * out through the control they are meant to use.
 *
 * Set `[altText]` for WCAG 2.2.1 compliance: the visible label (e.g.
 * "Undo") rarely carries enough context to recover the action once the
 * toast disappears. The alt text is appended to the toast's announcement
 * (`title. description. altText`), e.g. `altText="Undo (Cmd+Z)"`. It also
 * moves a bare `error` toast onto the `LiveAnnouncer` path, since the hint is
 * not in the visible DOM its host live region would read.
 */
@Directive({
  selector: '[forToastAction]',
  exportAs: 'forToastAction',
  host: {
    '[attr.type]': 'buttonType()',
    '(click)': 'onClick()',
  },
})
export class ForToastAction {
  private readonly buttonType = hostButtonType();

  private readonly ctx = injectToastContext('ForToastAction');
  readonly #destroyRef = inject(DestroyRef);

  /**
   * Recovery hint appended to the toast's announcement so the user knows how
   * to recover the action after the toast is gone. Required for time-limited
   * toasts per WCAG 2.2.1; defaults to `''` (no alt text).
   */
  readonly altText = input<string>('');

  constructor() {
    const handle = { altText: this.altText };
    registerHandle(
      handle,
      (h) => this.ctx.registerAction(h),
      (h) => this.ctx.unregisterAction(h),
    );
  }

  private onClick(): void {
    queueMicrotask(() => {
      if (!this.#destroyRef.destroyed) {
        this.ctx.requestClose('action');
      }
    });
  }
}
