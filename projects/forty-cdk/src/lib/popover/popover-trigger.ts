import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectPopoverContext } from './popover-context';

/**
 * Button that toggles the popover when clicked. Apply on a focusable
 * element — preferably a `<button>` — so keyboard users can reach it.
 *
 * Wires `aria-expanded`, `aria-controls`, and `aria-haspopup="dialog"`,
 * registers the host as the floating-ui anchor, and toggles the open
 * state on click. The trigger is exempt from the dismissable layer's
 * outside-pointer / outside-focus checks so its own click never
 * spuriously closes the popover.
 */
@Directive({
  selector: '[forPopoverTrigger]',
  exportAs: 'forPopoverTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick()',
  },
})
export class ForPopoverTrigger {
  protected readonly ctx = injectPopoverContext('ForPopoverTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() =>
      this.ctx.unregisterTrigger(this.#host.nativeElement),
    );
  }

  protected onClick(): void {
    this.ctx.toggle();
  }
}
