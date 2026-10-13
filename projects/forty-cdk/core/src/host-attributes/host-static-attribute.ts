import { computed, ElementRef, inject, type Signal } from '@angular/core';

export function hostStaticAttribute(
  name: string,
  fallback: () => string | null,
): Signal<string | null> {
  const consumer = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.getAttribute(name);
  return computed(() => fallback() ?? (consumer || null));
}
