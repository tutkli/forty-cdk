import { effect, ElementRef, inject, type Signal } from '@angular/core';

export function reflectRequired(
  required: Signal<boolean>,
  target?: () => HTMLElement | null,
): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const resolve = target ?? (() => host);
  let owner: HTMLElement | null = null;
  effect(() => {
    const el = resolve();
    if (owner !== null && owner !== el) {
      owner.removeAttribute('required');
      owner = null;
    }
    if (!el) {
      return;
    }
    if (required()) {
      if (!el.hasAttribute('required')) {
        el.setAttribute('required', '');
        owner = el;
      }
    } else if (owner === el) {
      el.removeAttribute('required');
      owner = null;
    }
  });
}
