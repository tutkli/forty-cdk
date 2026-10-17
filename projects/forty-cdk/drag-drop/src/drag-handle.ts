import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectDraggableContext } from './drag-drop-context';

/**
 * Optional drag handle inside a `[forDraggable]`. When at least one handle is present on an item, a pointer
 * drag may only start from within a handle (keyboard dragging is unaffected). Apply on a child element.
 * Sets `touch-action: none` while its item can be dragged, so a touch drag on the handle is not taken
 * by the page's scrolling.
 */
@Directive({
  selector: '[forDragHandle]',
  exportAs: 'forDragHandle',
  host: {
    '[style.touch-action]': 'context.handleTouchAction()',
    '[attr.data-drag-handle]': "''",
  },
})
export class ForDragHandle {
  private readonly context = injectDraggableContext('ForDragHandle');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.context.registerHandle(el),
      (el) => this.context.unregisterHandle(el),
    );
  }
}
