import { Directive, DOCUMENT, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectContextMenuContext } from './context-menu-context';

/**
 * Region that opens its parent `[forContextMenu]` on the `contextmenu` event
 * (right-click / long-press on touch) and on the keyboard equivalents
 * `Shift+F10` and the dedicated `ContextMenu` key. Pointer activations are
 * anchored at the cursor; keyboard activations are anchored at the bounding
 * rect of the focused element, so screen-reader / keyboard-only users get
 * the menu next to whatever they're working on. The native context menu is
 * suppressed via `event.preventDefault()`.
 *
 * Apply on any element. A default `tabindex="-1"` is host-bound so the
 * trigger can receive programmatic focus and return-focus works out of the
 * box on close — no consumer setup required. The default is overridable:
 * set your own `tabindex` (e.g. `tabindex="0"` to put the trigger in the
 * Tab order) and it wins. The keyboard activators (`Shift+F10`, the
 * `ContextMenu` key) need the trigger — or something inside it — focusable,
 * which the default guarantees.
 *
 * When `disabled`, only `data-disabled` is reflected as a styling / state
 * hook. The trigger is a generic region with no interactive ARIA role, so it
 * emits neither the native `disabled` attribute (which applies only to form
 * controls) nor `aria-disabled` (which is meaningful only on an interactive
 * role); the disabled behaviour is enforced by the in-handler guards, which
 * let the native browser menu show through instead.
 */
@Directive({
  selector: '[forContextMenuTrigger]',
  exportAs: 'forContextMenuTrigger',
  host: {
    tabindex: '-1',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(contextmenu)': 'onContextMenu($event)',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForContextMenuTrigger {
  protected readonly ctx = injectContextMenuContext();
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.ctx.registerTrigger(el),
      (el) => this.ctx.unregisterTrigger(el),
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
    const focused = this.#document.activeElement as HTMLElement | null;
    // Anchor at the focused element when it lives inside the trigger; fall
    // back to the trigger itself otherwise (e.g. focus is on the trigger).
    const anchorEl = focused && trigger.contains(focused) ? focused : trigger;
    this.ctx.setVirtualAnchorFromRect(anchorEl.getBoundingClientRect());
    this.ctx.openMenu('first');
  }
}
