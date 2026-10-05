import { DestroyRef, ElementRef, inject } from '@angular/core';

import { composedParentElement, resolveEventTarget } from '../composed-tree/composed-tree';
import { FOCUSABLE_SELECTOR } from '../focus-trap/focusable-candidate';

export function preventPointerFocus(when: (event: MouseEvent) => boolean = () => true): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const onMouseDown = (event: MouseEvent): void => {
    if (when(event)) {
      event.preventDefault();
    }
  };
  host.addEventListener('mousedown', onMouseDown);
  inject(DestroyRef).onDestroy(() => host.removeEventListener('mousedown', onMouseDown));
}

export function pressFocusesDescendant(event: Event, host: Element): boolean {
  for (
    let node = resolveEventTarget(event);
    node !== null && node !== host;
    node = composedParentElement(node)
  ) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      ((node as Element).hasAttribute('tabindex') || (node as Element).matches(FOCUSABLE_SELECTOR))
    ) {
      return true;
    }
  }
  return false;
}
