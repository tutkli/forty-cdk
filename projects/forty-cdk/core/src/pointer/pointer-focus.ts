import { DestroyRef, ElementRef, inject } from '@angular/core';

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
