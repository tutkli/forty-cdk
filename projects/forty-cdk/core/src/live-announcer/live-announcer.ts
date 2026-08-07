import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { MODAL_EXEMPT_ATTRIBUTE } from '../inert-siblings/inert-siblings';
import { VISUALLY_HIDDEN_STYLE } from '../visually-hidden/visually-hidden';

type Politeness = 'polite' | 'assertive';

interface LiveRegion {
  readonly element: HTMLElement;
  generation: number;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * Tiny ARIA live-region helper. Injects two persistent off-screen regions
 * (`polite` and `assertive`) into `document.body` at construction, then
 * writes / clears messages on demand.
 *
 * Each region declares one channel — `aria-live` plus `aria-atomic`, never a `role`. A live role
 * buys nothing here: its advantage is being read when a node is *inserted* with its text already
 * present, and these regions are inserted empty and only ever rewritten.
 *
 * They are created up front rather than on first use, because a live region must already be in the
 * accessibility tree before its text changes for the change to be announced; creating one inside
 * the first `announce()` risks dropping the first message of a session.
 *
 * Every message is flushed through a deferred write so the region is briefly emptied first, since
 * screen readers ignore repeated text that has not changed. The delay is a macrotask on purpose —
 * with both writes in one microtask drain the empty state never reaches the accessibility tree, and
 * NVDA and VoiceOver miss the repeat.
 *
 * The two politeness regions own independent timers, so a `polite` announce cannot cancel a pending
 * `assertive` one. Within a single region a superseding `announce()` coalesces and the latest
 * message wins, so text that evolves across a change-detection pass is read out once, in full.
 *
 * Each region carries the `MODAL_EXEMPT_ATTRIBUTE`, so an open modal does not inert it and swallow
 * every announcement made over it. The marker is stamped before the region is appended, so a region
 * created while a modal is already open is skipped too.
 *
 * The regions are detached and every pending write cancelled when the injector is destroyed. DOM
 * access is gated on `isPlatformBrowser`, so `announce()` and `clear()` are no-ops on the server.
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
  readonly #regions = new Map<Politeness, LiveRegion>();

  constructor() {
    if (this.#isBrowser) {
      for (const politeness of ['polite', 'assertive'] as const) {
        this.#createRegion(politeness);
      }
    }
    inject(DestroyRef).onDestroy(() => {
      for (const region of this.#regions.values()) {
        this.#cancel(region);
        region.element.remove();
      }
      this.#regions.clear();
    });
  }

  /**
   * Announce a message in the requested politeness region. Defaults to
   * `polite`, which lets the screen reader finish what it is currently
   * reading; `assertive` interrupts immediately.
   *
   * A superseding announce to the same region coalesces (the latest message
   * wins); the two regions are independent, so a `polite` announce never
   * cancels a pending `assertive` one. Pass an empty string (or call `clear()`)
   * to silence a pending announcement. No-op on a non-browser platform.
   */
  announce(message: string, politeness: Politeness = 'polite'): void {
    if (!this.#isBrowser) {
      return;
    }
    const region = this.#regions.get(politeness)!;
    region.element.textContent = '';
    this.#cancel(region);
    const generation = region.generation;
    region.timer = setTimeout(() => {
      region.timer = null;
      if (generation !== region.generation) {
        return;
      }
      region.element.textContent = message;
    }, 0);
  }

  /** Empty all live regions and cancel any pending announce so it never paints. */
  clear(): void {
    if (!this.#isBrowser) {
      return;
    }
    for (const region of this.#regions.values()) {
      this.#cancel(region);
      region.element.textContent = '';
    }
  }

  #cancel(region: LiveRegion): void {
    region.generation++;
    if (region.timer !== null) {
      clearTimeout(region.timer);
      region.timer = null;
    }
  }

  #createRegion(politeness: Politeness): void {
    const region = this.#document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute(MODAL_EXEMPT_ATTRIBUTE, '');
    // Visually hidden but kept in the accessibility tree.
    region.style.cssText = VISUALLY_HIDDEN_STYLE;
    this.#document.body.appendChild(region);
    this.#regions.set(politeness, { element: region, generation: 0, timer: null });
  }
}
