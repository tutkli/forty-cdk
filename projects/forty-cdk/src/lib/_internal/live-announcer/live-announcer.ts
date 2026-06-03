import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

type Politeness = 'polite' | 'assertive';

/**
 * Tiny ARIA live-region helper. Lazily injects two off-screen regions
 * (`polite` and `assertive`) into `document.body` the first time it is used,
 * then writes / clears messages on demand.
 *
 * Sequential identical announcements are flushed through a microtask so the
 * region is briefly emptied — without that, screen readers ignore repeated
 * text that hasn't actually changed.
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

  constructor() {
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
    const region = this.#getRegion(politeness);
    // Reset first so identical consecutive messages still trigger the reader.
    region.textContent = '';
    queueMicrotask(() => {
      region.textContent = message;
    });
  }

  /** Empty all live regions. Pending microtask writes still fire — call again afterwards if needed. */
  clear(): void {
    for (const region of this.#regions.values()) {
      region.textContent = '';
    }
  }

  #getRegion(politeness: Politeness): HTMLElement {
    let region = this.#regions.get(politeness);
    if (region) {
      return region;
    }
    region = this.#document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
    // Visually hidden but kept in the accessibility tree.
    const style = region.style;
    style.position = 'absolute';
    style.width = '1px';
    style.height = '1px';
    style.padding = '0';
    style.margin = '-1px';
    style.overflow = 'hidden';
    style.clip = 'rect(0, 0, 0, 0)';
    style.whiteSpace = 'nowrap';
    style.border = '0';
    this.#document.body.appendChild(region);
    this.#regions.set(politeness, region);
    return region;
  }
}
