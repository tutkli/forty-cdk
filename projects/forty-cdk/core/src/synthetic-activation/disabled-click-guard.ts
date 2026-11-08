import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, ElementRef, PLATFORM_ID, inject, type Signal } from '@angular/core';

/** Configuration for {@link injectDisabledClickGuard}. */
export interface DisabledClickGuardConfig {
  /** While truthy, a click on the host or on any of its descendants is cancelled. */
  disabled: Signal<boolean>;

  /**
   * Also cancel a middle-button `auxclick` while disabled, so a disabled link
   * cannot be opened in a new tab. Other buttons' `auxclick` pass through.
   */
  middleClick?: boolean;
}

/**
 * Cancels every click on a disabled host that stays focusable, which is why it
 * carries `aria-disabled` rather than the native `disabled` attribute.
 *
 * While `disabled()` is true, a capture-phase listener on the host calls
 * `preventDefault()` and `stopImmediatePropagation()` on each `click` (and, with
 * `middleClick`, each middle-button `auxclick`). Capture on the host runs before
 * every bubble-phase listener on the host and its descendants, so no `(click)`
 * binding on the element runs, whether a directive's host listener or the
 * consumer's template, and neither does any listener on an ancestor.
 *
 * Inert on the server. Must be called from an injection context.
 */
export function injectDisabledClickGuard(config: DisabledClickGuardConfig): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const controller = new AbortController();
  const options = { capture: true, signal: controller.signal };

  const cancel = (event: MouseEvent): void => {
    if (!config.disabled()) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  host.addEventListener('click', cancel, options);
  if (config.middleClick) {
    host.addEventListener(
      'auxclick',
      (event: MouseEvent) => {
        if (event.button === 1) {
          cancel(event);
        }
      },
      options,
    );
  }

  inject(DestroyRef).onDestroy(() => controller.abort());
}
