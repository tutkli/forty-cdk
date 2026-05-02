import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { ForContextMenu } from './context-menu';

/**
 * Region that opens its parent `[forContextMenu]` on the `contextmenu` event
 * (right-click / `Shift+F10` / long-press on touch). The native context
 * menu is suppressed via `event.preventDefault()`.
 *
 * Apply on any element. If you want focus to return there on close, give
 * the element a `tabindex` (e.g. `tabindex="-1"`) so it can receive
 * programmatic focus.
 */
@Directive({
  selector: '[forContextMenuTrigger]',
  exportAs: 'forContextMenuTrigger',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class ForContextMenuTrigger {
  protected readonly ctx = inject(ForContextMenu);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() =>
      this.ctx.unregisterTrigger(this.#host.nativeElement),
    );
  }

  protected onContextMenu(event: MouseEvent): void {
    if (this.ctx.disabled()) {
      // Let the native browser menu show.
      return;
    }
    event.preventDefault();
    this.ctx.setVirtualAnchor(event.clientX, event.clientY);
    this.ctx.openMenu('first');
  }
}
