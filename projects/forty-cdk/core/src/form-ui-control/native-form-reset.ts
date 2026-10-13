import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID } from '@angular/core';

type ValueElement = HTMLInputElement | HTMLTextAreaElement;

export function injectNativeFormReset(
  el: () => ValueElement | null,
  onReset: (text: string) => void,
): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  effect((onCleanup) => {
    const element = el();
    if (!element) {
      return;
    }
    const root = element.getRootNode();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener = (event: Event): void => {
      if (element.form === null || event.target !== element.form) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        if (!event.defaultPrevented) {
          onReset(element.value);
        }
      }, 0);
    };
    root.addEventListener('reset', listener);
    onCleanup(() => {
      root.removeEventListener('reset', listener);
      clearTimeout(timer);
    });
  });
}
