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

import { FOCUSABLE_SELECTOR } from '../focus-trap/focus-trap';

/**
 * Reports whether the host element currently has at least one focusable
 * descendant, reactive to subtree mutations.
 *
 * Used by `ForTabsContent` to implement the WAI-ARIA Tabs APG rule that a
 * `tabpanel` is itself a tab stop (`tabindex="0"`) **only** when it has no
 * focusable content of its own; a panel containing buttons / links / form
 * controls must not add a redundant tab stop.
 *
 * Detection mirrors the `FocusTrap` filter: it queries the shared
 * `FOCUSABLE_SELECTOR` and ignores `[hidden]` candidates and any candidate
 * nested under an `[inert]` ancestor below the host (those are not reachable
 * by Tab). A single `MutationObserver` scoped to the host's subtree watches
 * for childList / attribute changes so a panel that gains or loses focusable
 * content after first render flips the result.
 *
 * SSR-safe: on the server no observer is created, the DOM is never touched,
 * and the signal stays `false` (the panel is treated as having no focusable
 * content until the first browser render measures it). Cleaned up via
 * `DestroyRef`.
 *
 * The observer callback writing the signal is the single, intentional
 * "external imperative source → signal" exception, isolated here.
 *
 * Must be called from an injection context (it injects `ElementRef`,
 * `PLATFORM_ID`, and `DestroyRef`).
 *
 * Internal — not re-exported from `public-api.ts`.
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
  const candidates = host.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  for (const el of candidates) {
    if (el.hasAttribute('hidden')) {
      continue;
    }
    if (hasInertAncestor(el, host)) {
      continue;
    }
    return true;
  }
  return false;
}

function hasInertAncestor(el: HTMLElement, root: HTMLElement): boolean {
  let cur: HTMLElement | null = el.parentElement;
  while (cur && cur !== root) {
    if (cur.hasAttribute('inert')) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}
