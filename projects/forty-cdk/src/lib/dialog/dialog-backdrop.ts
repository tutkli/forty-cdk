import { Directive, inject } from '@angular/core';

import { injectPortal } from '../_internal/portal/portal';
import { FOR_DIALOG_INSTANCE_ID, injectDialogContext } from './dialog-context';

/**
 * Optional backdrop overlay. Portaled to `document.body` so it sits
 * underneath the dialog regardless of where it's declared. While mounted
 * the backdrop is visible; mount/unmount it alongside the dialog with
 * the same `@if` so `animate.enter` / `animate.leave` works on both.
 *
 * The directive applies no visual styles — set `position: fixed; inset: 0;
 * background: rgba(0,0,0,0.5)` (or whatever) yourself.
 */
@Directive({
  selector: '[forDialogBackdrop]',
  exportAs: 'forDialogBackdrop',
  host: {
    'data-for-dialog-backdrop': '',
    // Marker the inert-siblings utility looks for so the backdrop, which is
    // portaled to body alongside the dialog, is not inerted alongside the
    // rest of the document.
    'data-for-modal-peer': '',
    'data-state': 'open',
    '[attr.data-for-dialog-id]': 'instanceId',
    '(click)': 'onClick($event)',
  },
})
export class ForDialogBackdrop {
  protected readonly ctx = injectDialogContext('ForDialogBackdrop');

  /**
   * Per-instance dialog id when opened through `ForDialogManager` (reflected
   * as `data-for-dialog-id` so the manager can pair this portaled backdrop
   * with its dialog and drive its exit animation). `null` in the declarative
   * path, where the host binding emits no attribute.
   */
  protected readonly instanceId = inject(FOR_DIALOG_INSTANCE_ID, { optional: true });

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
