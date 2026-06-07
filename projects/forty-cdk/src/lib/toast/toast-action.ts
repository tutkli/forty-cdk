import { Directive, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectToastContext } from './toast-context';

/**
 * Action button inside a toast (e.g. "Undo"). Apply on a
 * `<button type="button">` so Space / Enter dispatch a native click.
 *
 * Clicking emits `(close)` from the parent `[forToast]` with reason
 * `'action'`. Wire your action handler with `(click)` on this element
 * itself — the close fires after your handler runs (via event order).
 *
 * The action is the **sanctioned dismissal path even when the toast is
 * `closable=false`**: a forced-action toast suppresses Escape / swipe / the
 * close button but keeps the action button live so the user always has a way
 * out through the control they are meant to use.
 *
 * Set `[altText]` for WCAG 2.2.1 compliance: the visible label (e.g.
 * "Undo") rarely carries enough context to recover the action once the
 * toast disappears. The alt text replaces the toast's automatic live
 * announcement with a self-contained string, e.g. `altText="Undo (Cmd+Z)"`.
 * When at least one action carries an alt text, the parent toast routes
 * its announcement through `LiveAnnouncer` and silences the host
 * `aria-live` to avoid a duplicate readout.
 */
@Directive({
  selector: '[forToastAction]',
  exportAs: 'forToastAction',
  host: {
    type: 'button',
    '(click)': 'onClick()',
  },
})
export class ForToastAction {
  protected readonly ctx = injectToastContext('ForToastAction');

  /**
   * Self-contained text read aloud in place of the visible label so the
   * user knows how to recover the action after the toast is gone. Required
   * for time-limited toasts per WCAG 2.2.1; defaults to `''` (no alt text).
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

  protected onClick(): void {
    this.ctx.requestClose('action');
  }
}
