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

import {
  isFocusableCandidate,
  queryFocusableCandidates,
} from '../focusable-candidate/focusable-candidate';

/**
 * Reports whether the host element currently has at least one focusable
 * descendant, reactive to subtree mutations.
 *
 * Used by `ForTabsContent` to implement the WAI-ARIA Tabs APG rule that a
 * `tabpanel` is itself a tab stop (`tabindex="0"`) **only** when it has no
 * focusable content of its own; a panel containing buttons / links / form
 * controls must not add a redundant tab stop.
 *
 * Detection runs the shared `isFocusableCandidate` filter over
 * `queryFocusableCandidates`, so it stays byte-for-byte aligned with
 * `FocusTrap`: a candidate is ignored when it is `[hidden]`, carries or is
 * nested under an `[inert]` ancestor below the host, or is hidden via CSS
 * (`display: none` / `visibility: hidden`) — none of which can receive focus.
 * That query descends into open shadow roots, so a panel whose only control is
 * rendered inside a web component is correctly reported as having focusable
 * content and does not take a redundant tab stop of its own. **Boundary:** the
 * observer below cannot see into a shadow root, so a panel that gains or loses
 * its focusable content *inside* one keeps the answer measured at the last
 * light-DOM mutation.
 *
 * A single `MutationObserver` scoped to the host's subtree watches for
 * childList and attribute changes so a panel that gains or loses focusable
 * content after first render flips the result. **Boundary:** the observer's
 * `attributeFilter` does not include `class` or `style`, so a visibility flip
 * applied purely through a CSS class or an external stylesheet (rather than
 * through one of the watched attributes or a childList change) does not
 * re-trigger evaluation. Extending invalidation to cover class- or
 * stylesheet-driven flips is deliberately out of scope (#1382); the initial
 * render is always measured correctly because the filter itself now excludes
 * CSS-hidden candidates.
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
 * Internal core tier — exported from `forty-cdk/core` for the library's own
 * entry points, with no semver guarantee.
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
