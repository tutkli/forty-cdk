import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MODAL_EXEMPT_ATTRIBUTE } from '../inert-siblings/inert-siblings';
import { VISUALLY_HIDDEN_STYLE } from '../visually-hidden/visually-hidden';

type Politeness = 'polite' | 'assertive';

/**
 * Tiny ARIA live-region helper. Injects two persistent off-screen regions
 * (`polite` and `assertive`) into `document.body` at construction, then
 * writes / clears messages on demand.
 *
 * The regions are created up front — not on first use — because a live region
 * must already exist in the accessibility tree before its text changes for
 * that change to be announced. Creating the region inside the first
 * `announce()` risks the first message of a session being dropped, since the
 * node insertion and the text write land too close together for many screen
 * readers to register the mutation.
 *
 * Sequential identical announcements are flushed through a deferred write
 * (`setTimeout(…, 0)`) so the region is briefly emptied — without that, screen
 * readers ignore repeated text that hasn't actually changed. A macrotask (not a
 * microtask) is used deliberately: many screen readers (NVDA, VoiceOver) miss
 * the clear→repopulate cycle on repeat messages when both writes land in the
 * same microtask drain, because the empty state never reaches the
 * accessibility tree between them. Each write carries a generation token, so a
 * superseding `announce()` or a `clear()` cancels the prior pending write
 * before it can paint a stale message.
 *
 * Each region carries the `MODAL_EXEMPT_ATTRIBUTE` so it stays out of the
 * modal inert pass: `InertSiblingsStack` inerts and `aria-hidden`s every
 * unmarked `document.body` child while a modal dialog / drawer is open, which
 * would otherwise swallow every announcement routed through the announcer
 * (e.g. a `ForToast` shown over an open modal) — a WCAG 4.1.3 status-message
 * failure invisible to sighted users. The marker is stamped before the region
 * is appended, so the stack's late-sibling `MutationObserver` also skips a
 * region created while a modal is already open.
 *
 * The regions are detached again when the service's injector is destroyed
 * (one bootstrap per SSR request, or `TestBed.resetTestingModule()`), so a
 * torn-down application leaves no orphaned `[aria-live]` nodes behind. DOM
 * access is gated on `isPlatformBrowser`, so `announce()` / `clear()` are
 * no-ops on the server.
 *
 * @example
 * ```ts
 * private readonly announcer = inject(LiveAnnouncer);
 *
 * onUploadComplete(): void {
 *   this.announcer.announce('Upload complete', 'polite');
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class LiveAnnouncer {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #regions = new Map<Politeness, HTMLElement>();
  #generation = 0;

  constructor() {
    if (this.#isBrowser) {
      for (const politeness of ['polite', 'assertive'] as const) {
        this.#createRegion(politeness);
      }
    }
    inject(DestroyRef).onDestroy(() => {
      for (const region of this.#regions.values()) {
        region.remove();
      }
      this.#regions.clear();
    });
  }

  /**
   * Announce a message in the requested politeness region. Defaults to
   * `polite`, which lets the screen reader finish what it is currently
   * reading; `assertive` interrupts immediately.
   *
   * Pass an empty string (or call `clear()`) to silence pending announcements.
   * No-op on a non-browser platform.
   */
  announce(message: string, politeness: Politeness = 'polite'): void {
    if (!this.#isBrowser) {
      return;
    }
    const region = this.#regions.get(politeness)!;
    // Reset first so identical consecutive messages still trigger the reader.
    region.textContent = '';
    // Bump the generation so a superseding announce (or a clear) cancels this
    // pending write before it paints.
    const generation = ++this.#generation;
    setTimeout(() => {
      if (generation !== this.#generation) {
        return;
      }
      region.textContent = message;
    }, 0);
  }

  /** Empty all live regions and cancel any pending announce so it never paints. */
  clear(): void {
    if (!this.#isBrowser) {
      return;
    }
    this.#generation++;
    for (const region of this.#regions.values()) {
      region.textContent = '';
    }
  }

  #createRegion(politeness: Politeness): void {
    const region = this.#document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    region.setAttribute(MODAL_EXEMPT_ATTRIBUTE, '');
    // Visually hidden but kept in the accessibility tree.
    region.style.cssText = VISUALLY_HIDDEN_STYLE;
    this.#document.body.appendChild(region);
    this.#regions.set(politeness, region);
  }
}
