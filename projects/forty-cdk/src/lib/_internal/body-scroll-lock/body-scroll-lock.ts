import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Refcounted body scroll lock. Multiple modal surfaces (stacked dialogs,
 * dialog over drawer, etc.) acquire and release locks independently — only
 * the first acquire mutates `<body>`, only the last release restores it.
 *
 * Saves and restores the original `overflow` and `padding-right`. The
 * scrollbar-width compensation prevents content jumping when overflow goes
 * from `auto` (scrollbar shown) to `hidden` (scrollbar hidden).
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
  #savedOverflow: string | null = null;
  #savedPaddingRight: string | null = null;

  lock(): void {
    if (!this.#isBrowser) {
      return;
    }
    if (this.#count === 0) {
      const body = this.#document.body;
      const docEl = this.#document.documentElement;
      const win = this.#window;
      const scrollbarWidth = win ? win.innerWidth - docEl.clientWidth : 0;

      this.#savedOverflow = body.style.overflow;
      this.#savedPaddingRight = body.style.paddingRight;

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
      body.style.overflow = this.#savedOverflow ?? '';
      body.style.paddingRight = this.#savedPaddingRight ?? '';
      this.#savedOverflow = null;
      this.#savedPaddingRight = null;
    }
  }
}

