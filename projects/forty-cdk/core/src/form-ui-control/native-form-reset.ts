import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  PLATFORM_ID,
  untracked,
  type WritableSignal,
} from '@angular/core';

type ValueElement = HTMLInputElement | HTMLTextAreaElement;

function listenForFormReset(
  element: Element,
  form: () => HTMLFormElement | null,
  onReset: () => void,
): () => void {
  const root = element.getRootNode();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listener = (event: Event): void => {
    const owner = form();
    if (owner === null || event.target !== owner) {
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (!event.defaultPrevented) {
        onReset();
      }
    }, 0);
  };
  root.addEventListener('reset', listener);
  return () => {
    root.removeEventListener('reset', listener);
    clearTimeout(timer);
  };
}

export function injectRenderedDefaultValue(el: () => ValueElement | null): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const injector = inject(Injector);
  effect((onCleanup) => {
    const element = el();
    if (!element) {
      return;
    }
    const ref = untracked(() =>
      afterNextRender(
        () => {
          element.defaultValue = element.value;
        },
        { injector },
      ),
    );
    onCleanup(() => ref.destroy());
  });
}

export function injectNativeFormReset(
  el: () => ValueElement | null,
  onReset: (text: string) => void,
): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  injectRenderedDefaultValue(el);
  effect((onCleanup) => {
    const element = el();
    if (!element) {
      return;
    }
    onCleanup(
      listenForFormReset(
        element,
        () => element.form,
        () => onReset(element.value),
      ),
    );
  });
}

export function injectNativeFormResetToInitial<T>(
  model: WritableSignal<T>,
  onReset?: () => void,
): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const host = inject<ElementRef<Element>>(ElementRef).nativeElement;
  let stop: (() => void) | undefined;
  afterNextRender(() => {
    const initial = model();
    stop = listenForFormReset(
      host,
      () => host.closest('form'),
      () => {
        model.set(initial);
        onReset?.();
      },
    );
  });
  inject(DestroyRef).onDestroy(() => stop?.());
}
