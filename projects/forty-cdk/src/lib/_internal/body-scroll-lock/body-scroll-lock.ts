import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Refcounted body scroll lock. Multiple modal surfaces (stacked dialogs,
 * dialog over drawer, etc.) acquire and release locks independently — only
 * the first acquire mutates `<body>`, only the last release un-mutates it.
 *
 * **Semantic: clear, do not restore.** On the first lock the service writes
 * `overflow: hidden` and an optional scrollbar-compensating `padding-right`
 * inline on `<body>`. On the final unlock it _clears_ the inline styles it
 * set (`body.style.overflow = ''`, and `body.style.paddingRight = ''` only
 * when this lock actually wrote it) and lets the CSS cascade take over
 * again. It does NOT snapshot the values at lock time and rewrite them at
 * unlock time.
 *
 * On overlay-scrollbar / mobile platforms there is no classic scrollbar
 * (`innerWidth - clientWidth === 0`), so the lock never writes
 * `padding-right`. In that case the final unlock leaves
 * `body.style.paddingRight` untouched, so a consumer's unrelated inline
 * `padding-right` survives. The clear-don't-restore contract only applies to
 * values the lock owns. See #391.
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
  #wrotePaddingRight = false;

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
      // Skip padding compensation when `scrollbar-gutter: stable` already
      // reserves the gutter: the space stays reserved across the overflow
      // toggle, so there is no content shift to compensate and adding
      // padding-right would double-pad.
      if (scrollbarWidth > 0 && win && !this.#gutterIsStable(win, docEl, body)) {
        const computed = win.getComputedStyle(body).paddingRight;
        const currentPx = parseFloat(computed) || 0;
        body.style.paddingRight = `${currentPx + scrollbarWidth}px`;
        this.#wrotePaddingRight = true;
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
      // Only clear padding-right when this lock actually wrote it, so a
      // consumer's unrelated inline padding-right survives on no-scrollbar
      // platforms where the lock never set it.
      body.style.overflow = '';
      if (this.#wrotePaddingRight) {
        body.style.paddingRight = '';
        this.#wrotePaddingRight = false;
      }
    }
  }

  /**
   * True when the scroll container reserves the scrollbar gutter via
   * `scrollbar-gutter: stable` (or `stable both-edges`). The gutter then
   * survives the `overflow: hidden` toggle, so no padding compensation is
   * needed. Checked on both `<html>` (the document scroller) and `<body>`,
   * since either can carry the property.
   */
  #gutterIsStable(win: Window, docEl: HTMLElement, body: HTMLElement): boolean {
    for (const el of [docEl, body]) {
      const gutter = win.getComputedStyle(el).getPropertyValue('scrollbar-gutter');
      if (gutter.trim().split(/\s+/).includes('stable')) {
        return true;
      }
    }
    return false;
  }
}
