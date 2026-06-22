import { Directive, inject, TemplateRef } from '@angular/core';

import { injectDraggableContext } from './drag-drop-context';

/**
 * Optional custom drag placeholder. Apply `[forDragPlaceholder]` on an `<ng-template>` inside a
 * `[forDraggable]`; during a **pointer** drag the dragged item's host is hidden and this template
 * renders in its slot, preserving the gap. Keyboard dragging keeps the default (the lifted item
 * stays in place, reflecting `data-dragging`).
 */
@Directive({
  selector: 'ng-template[forDragPlaceholder]',
  exportAs: 'forDragPlaceholder',
})
export class ForDragPlaceholder {
  /** The template rendered in the dragged item's slot during a pointer drag. */
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  constructor() {
    injectDraggableContext('ForDragPlaceholder');
  }
}
