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
 * Each region declares exactly one channel: `aria-live` plus `aria-atomic`,
 * never a `role`. The two are redundant — `role="status"` implies
 * `aria-live="polite"` + `aria-atomic="true"` and `role="alert"` implies
 * `assertive` — and the attribute pair is the channel to keep here. The one
 * behaviour a live role adds is being read reliably when a node is *inserted*
 * with its text already present, which is why `ForToast`'s bare-error host
 * keeps `role="alert"`; these regions are inserted empty at construction and
 * only ever have their text rewritten, so the role buys them nothing. The pair
 * also states `aria-atomic` outright instead of leaving it to an implicit role
 * mapping.
 *
 * The regions are created up front — not on first use — because a live region
 * must already exist in the accessibility tree before its text changes for
 * that change to be announced. Creating the region inside the first
 * `announce()` risks the first message of a session being dropped, since the
 * node insertion and the text write land too close together for many screen
 * readers to register the mutation.
 *
 * Every message is flushed through a deferred write (`setTimeout(…, 0)`) so the
 * region is briefly emptied before the text lands — without that, screen
 * readers ignore repeated text that hasn't actually changed. A macrotask (not a
 * microtask) is used deliberately: many screen readers (NVDA, VoiceOver) miss
 * the clear→repopulate cycle on repeat messages when both writes land in the
 * same microtask drain, because the empty state never reaches the
 * accessibility tree between them.
 *
 * Each politeness region owns an **independent generation counter and timer**,
 * so the two regions never interfere: a `polite` announce cannot cancel a
 * pending `assertive` write (the keyboard-drop-plus-confirmation-toast case,
 * where a drop and its confirmation toast fire in the same handler). Within a
 * single region a superseding `announce()` still coalesces — the latest message
 * wins — so an announcement that evolves across a change-detection pass (e.g. a
 * toast whose composed text grows as its parts register) is read out once, in
 * full, instead of voicing every intermediate value.
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
 * The regions are detached — and every pending write cancelled — when the
 * service's injector is destroyed (one bootstrap per SSR request, or
 * `TestBed.resetTestingModule()`), so a torn-down application leaves no
 * orphaned `[aria-live]` nodes behind and no timer fires against a destroyed
 * context. DOM access is gated on `isPlatformBrowser`, so `announce()` /
 * `clear()` are no-ops on the server.
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
