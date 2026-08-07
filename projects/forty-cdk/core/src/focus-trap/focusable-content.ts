import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
  type Signal,
} from '@angular/core';

import { isFocusableCandidate, queryFocusableCandidates } from './focusable-candidate';

/**
 * Reports whether the host element currently has at least one focusable
 * descendant, reactive to subtree mutations.
 *
 * Backs the WAI-ARIA Tabs rule that a `tabpanel` is itself a tab stop only when it has no focusable
 * content of its own.
 *
 * Candidates are filtered through the same predicate `FocusTrap` uses, so `[hidden]`, `[inert]` and
 * CSS-hidden elements do not count, and content inside an open shadow root does.
 *
 * A `MutationObserver` on the host's subtree re-measures on childList and attribute changes. Two
 * boundaries follow from it: the observer cannot see into a shadow root, and its `attributeFilter`
 * excludes `class` and `style`, so a visibility flip driven purely by a stylesheet keeps the
 * previously measured answer.
 *
 * SSR-safe: off-browser no observer is created and the signal stays `false`.
 *
 * Must be called from an injection context.
 */
export function injectHasFocusableContent(): Signal<boolean> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const destroyRef = inject(DestroyRef);

  const has = signal(false);

  if (!isBrowser) {
    return has.asReadonly();
  }

  const measure = (): void => has.set(hasFocusableDescendant(host));

  const win = host.ownerDocument.defaultView;
  if (win && typeof win.MutationObserver === 'function') {
    const observer = new win.MutationObserver(() => measure());
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'inert', 'tabindex', 'type', 'contenteditable'],
    });
    destroyRef.onDestroy(() => observer.disconnect());
  }

  afterNextRender(measure);

  return has.asReadonly();
}

function hasFocusableDescendant(host: HTMLElement): boolean {
  const candidates = queryFocusableCandidates(host);
  for (const el of candidates) {
    if (isFocusableCandidate(el, host)) {
      return true;
    }
  }
  return false;
}
