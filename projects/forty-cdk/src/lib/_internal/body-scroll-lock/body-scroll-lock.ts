import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Refcounted body scroll lock. Multiple modal surfaces (stacked dialogs,
 * dialog over drawer, etc.) acquire and release locks independently — only
 * the first acquire mutates `<body>`, only the last release un-mutates it.
 *
 * **Semantic: clear, do not restore.** On the first lock the service writes
 * `overflow: hidden` and an optional scrollbar-compensating `padding-right`
 * inline on `<body>`. On the final unlock it _clears_ those two inline
 * styles (`body.style.overflow = ''`, `body.style.paddingRight = ''`) and
 * lets the CSS cascade take over again. It does NOT snapshot the values at
 * lock time and rewrite them at unlock time.
 *
 * Why: any code (route transition, theme toggle, the consumer themselves)
 * that mutates `body.style.overflow` between `lock()` and the final
 * `unlock()` would otherwise be silently clobbered when we restored the
 * stale snapshot. Clearing on unlock means the lock owns the inline style
 * only while it exists; intervening mutations win, and the resting state
 * is whatever stylesheet rules apply to `<body>`. This matches Radix /
 * Floating UI semantics. See #149.
 *
 * The scrollbar-width compensation prevents content jumping when overflow
 * goes from `auto` (scrollbar shown) to `hidden` (scrollbar hidden).
 *
 * SSR: the service is `providedIn: 'root'` so its counter is scoped to a
 * single Angular bootstrap (one per SSR request). Server-side calls are
 * no-ops.
 */
@Injectable({ providedIn: 'root' })
export class BodyScrollLock {
  readonly #document = inject(DOCUMENT);
  readonly #window = this.#document.defaultView;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  #count = 0;

  lock(): void {
    if (!this.#isBrowser) {
      return;
    }
    if (this.#count === 0) {
      const body = this.#document.body;
      const docEl = this.#document.documentElement;
      const win = this.#window;
      const scrollbarWidth = win ? win.innerWidth - docEl.clientWidth : 0;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0 && win) {
        const computed = win.getComputedStyle(body).paddingRight;
        const currentPx = parseFloat(computed) || 0;
        body.style.paddingRight = `${currentPx + scrollbarWidth}px`;
      }
    }
    this.#count++;
  }

  unlock(): void {
    if (!this.#isBrowser || this.#count === 0) {
      return;
    }
    this.#count--;
    if (this.#count === 0) {
      const body = this.#document.body;
      // Clear, do not restore: drop the inline styles we set so the CSS
      // cascade takes over and any intervening external mutations win.
      body.style.overflow = '';
      body.style.paddingRight = '';
    }
  }
}
