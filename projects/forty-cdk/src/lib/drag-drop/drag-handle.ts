import { Directive, ElementRef, inject } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectDraggableContext } from './drag-drop-context';

/**
 * Optional drag handle inside a `[forDraggable]`. When at least one handle is present on an item, a pointer
 * drag may only start from within a handle (keyboard dragging is unaffected). Apply on a child element.
 */
@Directive({
  selector: '[forDragHandle]',
  exportAs: 'forDragHandle',
  host: {
    '[style.touch-action]': "'none'",
    '[attr.data-drag-handle]': "''",
  },
})
export class ForDragHandle {
  readonly #context = injectDraggableContext('ForDragHandle');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    registerHandle(
      this.#host.nativeElement,
      (el) => this.#context.registerHandle(el),
      (el) => this.#context.unregisterHandle(el),
    );
  }
}
