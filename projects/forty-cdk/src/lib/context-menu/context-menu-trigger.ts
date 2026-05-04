import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { ForContextMenu } from './context-menu';

/**
 * Region that opens its parent `[forContextMenu]` on the `contextmenu` event
 * (right-click / long-press on touch) and on the keyboard equivalents
 * `Shift+F10` and the dedicated `ContextMenu` key. Pointer activations are
 * anchored at the cursor; keyboard activations are anchored at the bounding
 * rect of the focused element, so screen-reader / keyboard-only users get
 * the menu next to whatever they're working on. The native context menu is
 * suppressed via `event.preventDefault()`.
 *
 * Apply on any element. If you want focus to return there on close, give
 * the element a `tabindex` (e.g. `tabindex="-1"`) so it can receive
 * programmatic focus — the keyboard activators also need the trigger (or
 * something inside it) to be focusable in the first place.
 */
@Directive({
  selector: '[forContextMenuTrigger]',
  exportAs: 'forContextMenuTrigger',
  host: {
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForContextMenuTrigger {
  protected readonly ctx = inject(ForContextMenu);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterTrigger(this.#host.nativeElement));
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

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) {
      return;
    }
    const isShiftF10 = event.key === 'F10' && event.shiftKey;
    const isContextMenuKey = event.key === 'ContextMenu';
    if (!isShiftF10 && !isContextMenuKey) {
      return;
    }
    // Stop the browser from opening its own context menu on top of ours.
    event.preventDefault();
    const trigger = this.#host.nativeElement;
    const focused = document.activeElement as HTMLElement | null;
    // Anchor at the focused element when it lives inside the trigger; fall
    // back to the trigger itself otherwise (e.g. focus is on the trigger).
    const anchorEl = focused && trigger.contains(focused) ? focused : trigger;
    this.ctx.setVirtualAnchorFromRect(anchorEl.getBoundingClientRect());
    this.ctx.openMenu('first');
  }
}
