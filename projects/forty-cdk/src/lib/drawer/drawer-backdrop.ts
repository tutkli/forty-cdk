import { Directive } from '@angular/core';

import { injectPortal } from '../_internal/portal/portal';
import { injectDrawerContext } from './drawer-context';

/**
 * Optional backdrop overlay. Portaled to `document.body` so it sits
 * underneath the drawer regardless of where it's declared. While mounted
 * the backdrop is visible; mount/unmount it alongside the drawer with the
 * same `@if` so `animate.enter` / `animate.leave` works on both.
 *
 * Reflects `data-fade-from-active` when `fadeFromIndex` on the drawer root
 * is set and the active snap point is at or past that index — consumers
 * tie this to a CSS opacity transition for the Vaul-style "backdrop fades
 * in once you snap up past N" effect. The directive applies no visual
 * styles.
 */
@Directive({
  selector: '[forDrawerBackdrop]',
  exportAs: 'forDrawerBackdrop',
  host: {
    'data-for-drawer-backdrop': '',
    // Marker the inert-siblings utility looks for so the backdrop, which is
    // portaled to body alongside the drawer, is not inerted alongside the
    // rest of the document.
    'data-for-modal-peer': '',
    'data-state': 'open',
    '[attr.data-fade-from-active]': 'ctx.fadeFromActive() ? "" : null',
    '(click)': 'onClick($event)',
  },
})
export class ForDrawerBackdrop {
  protected readonly ctx = injectDrawerContext('ForDrawerBackdrop');

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
