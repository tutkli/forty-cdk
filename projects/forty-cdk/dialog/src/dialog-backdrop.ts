import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectPortal } from 'forty-cdk/core-overlay';
import { FOR_DIALOG_INSTANCE_ID, injectDialogContext } from './dialog-context';

/**
 * Optional backdrop overlay. Portaled to the dialog's `container` (the same
 * target the surface uses) — `document.body` by default. While mounted the
 * backdrop is visible; mount/unmount it alongside the dialog with the same
 * `@if` so `animate.enter` / `animate.leave` works on both.
 *
 * The directive applies no visual styles — set `position: fixed; inset: 0;
 * background: rgba(0,0,0,0.5)` (or whatever) yourself. For a backdrop inside a
 * scoped `container`, use `position: absolute` so it is bounded to that box.
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
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Per-instance dialog id when opened through `ForDialogManager` (reflected
   * as `data-for-dialog-id` so the manager can pair this portaled backdrop
   * with its dialog and drive its exit animation). `null` in the declarative
   * path, where the host binding emits no attribute.
   */
  protected readonly instanceId = inject(FOR_DIALOG_INSTANCE_ID, { optional: true });

  constructor() {
    injectPortal({ target: this.ctx.container });
    this.ctx.registerBackdrop(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.registerBackdrop(null));
  }

  protected onClick(event: MouseEvent): void {
    // Only close on direct backdrop click, not events bubbled from a child.
    if (event.target === event.currentTarget) {
      this.ctx.requestClose('backdrop');
    }
  }
}
