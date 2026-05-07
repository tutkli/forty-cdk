import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectMenuContext } from '../menu/menu-context';

/**
 * Button that toggles the dropdown menu when clicked, opens via ArrowDown
 * (focus first item) or ArrowUp (focus last item).
 *
 * Apply on a `<button>` so Space / Enter dispatch native click events
 * automatically — those open the menu via `(click)`. Wires `aria-haspopup`,
 * `aria-expanded`, and `aria-controls` per the menu-button pattern.
 */
@Directive({
  selector: '[forDropdownMenuTrigger]',
  exportAs: 'forDropdownMenuTrigger',
  host: {
    type: 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.open() ? ctx.contentId() : null',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForDropdownMenuTrigger {
  protected readonly ctx = injectMenuContext('ForDropdownMenuTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    this.ctx.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.unregisterTrigger(this.#host.nativeElement));
  }

  protected onClick(): void {
    this.ctx.toggle('first');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.disabled()) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.ctx.openMenu('first');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.ctx.openMenu('last');
    }
  }
}
