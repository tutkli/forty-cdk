import { Directive, inject, TemplateRef } from '@angular/core';

import { injectDraggableContext } from './drag-drop-context';

/**
 * Optional custom drag preview. Apply `[forDragPreview]` on an `<ng-template>` inside a
 * `[forDraggable]`; its content renders as the floating element that follows the pointer during a
 * pointer drag, replacing the default cloned preview. Has no effect on keyboard dragging.
 */
@Directive({
  selector: 'ng-template[forDragPreview]',
  exportAs: 'forDragPreview',
})
export class ForDragPreview {
  /** The template rendered as the floating pointer-drag preview. */
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);

  constructor() {
    injectDraggableContext('ForDragPreview');
  }
}
