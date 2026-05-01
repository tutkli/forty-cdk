import { Directive } from '@angular/core';

import { injectPortal } from '../_internal/portal';
import { injectDialogContext } from './dialog-context';

/**
 * Optional backdrop overlay. Portaled to `document.body` so it sits
 * underneath the dialog regardless of where it's declared. When
 * `dismissible` is on, clicking the backdrop closes the dialog.
 *
 * The directive applies no visual styles — set `position: fixed; inset: 0;
 * background: rgba(0,0,0,0.5)` (or whatever) yourself.
 */
@Directive({
  selector: '[forDialogBackdrop]',
  exportAs: 'forDialogBackdrop',
  host: {
    'data-for-dialog-backdrop': '',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.hidden]': 'ctx.open() ? null : ""',
    '(click)': 'onClick($event)',
  },
})
export class ForDialogBackdrop {
  protected readonly ctx = injectDialogContext('ForDialogBackdrop');

  constructor() {
    injectPortal();
  }

  protected onClick(event: MouseEvent): void {
    // Only close on direct backdrop click, not events bubbled from a child.
    if (event.target === event.currentTarget) {
      this.ctx.requestClose('backdrop');
    }
  }
}
