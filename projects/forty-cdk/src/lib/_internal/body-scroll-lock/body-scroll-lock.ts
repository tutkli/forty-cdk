import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Refcounted scroll lock, keyed per target element (default `<body>`).
 * Multiple modal surfaces acquire and release locks independently — only the
 * first acquire for a given target mutates that target, only the last release
 * un-mutates it. Different targets (body vs a container element) are fully
 * independent: locking a container does not affect body scroll and vice versa.
 *
 * **Semantic: clear, do not restore.** On the first lock for a target the
 * service writes `overflow: hidden` and an optional scrollbar-compensating
 * `padding-right` inline on that target. On the final unlock it _clears_ the
 * inline styles it set (`target.style.overflow = ''`, and
 * `target.style.paddingRight = ''` only when this lock actually wrote it) and
 * lets the CSS cascade take over again. It does NOT snapshot the values at
 * lock time and rewrite them at unlock time.
 *
 * On overlay-scrollbar / mobile platforms there is no classic scrollbar
 * (`innerWidth - clientWidth === 0` for the body path), so the lock never
 * writes `padding-right`. In that case the final unlock leaves
 * `target.style.paddingRight` untouched, so a consumer's unrelated inline
 * `padding-right` survives. The clear-don't-restore contract only applies to
 * values the lock owns. See #391.
 *
 * Why: any code (route transition, theme toggle, the consumer themselves)
 * that mutates `target.style.overflow` between `lock()` and the final
 * `unlock()` would otherwise be silently clobbered when we restored the
 * stale snapshot. Clearing on unlock means the lock owns the inline style
 * only while it exists; intervening mutations win, and the resting state
 * is whatever stylesheet rules apply. This matches Radix / Floating UI
 * semantics. See #149.
 *
 * The scrollbar-width compensation prevents content jumping when overflow
 * goes from `auto` (scrollbar shown) to `hidden` (scrollbar hidden).
 * For the body path the width is `window.innerWidth - documentElement.clientWidth`;
 * for an element path it is `target.offsetWidth - target.clientWidth`.
 *
 * SSR: the service is `providedIn: 'root'` so its counter map is scoped to a
 * single Angular bootstrap (one per SSR request). Server-side calls are
 * no-ops.
 */
@Injectable({ providedIn: 'root' })
export class BodyScrollLock {
  readonly #document = inject(DOCUMENT);
  readonly #window = this.#document.defaultView;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #targets = new Map<HTMLElement, { count: number; wrotePaddingRight: boolean }>();

  /**
   * Acquire the scroll lock on `target` (default `document.body`). The first
   * call for a given target sets `overflow: hidden` and compensates for the
   * scrollbar width; subsequent calls increment the refcount only.
   */
  lock(target: HTMLElement = this.#document.body): void {
    if (!this.#isBrowser) {
      return;
    }
    let record = this.#targets.get(target);
    if (!record) {
      record = { count: 0, wrotePaddingRight: false };
      this.#targets.set(target, record);
    }
    if (record.count === 0) {
      target.style.overflow = 'hidden';
      const isBody = target === this.#document.body;
      const win = this.#window;
      let scrollbarWidth: number;
      if (isBody) {
        const docEl = this.#document.documentElement;
        scrollbarWidth = win ? win.innerWidth - docEl.clientWidth : 0;
        if (scrollbarWidth > 0 && win && !this.#gutterIsStable(win, [docEl, target])) {
          const computed = win.getComputedStyle(target).paddingRight;
          const currentPx = parseFloat(computed) || 0;
          target.style.paddingRight = `${currentPx + scrollbarWidth}px`;
          record.wrotePaddingRight = true;
        }
      } else {
        scrollbarWidth = target.offsetWidth - target.clientWidth;
        if (scrollbarWidth > 0 && win && !this.#gutterIsStable(win, [target])) {
          const computed = win.getComputedStyle(target).paddingRight;
          const currentPx = parseFloat(computed) || 0;
          target.style.paddingRight = `${currentPx + scrollbarWidth}px`;
          record.wrotePaddingRight = true;
        }
      }
    }
    record.count++;
  }

  /**
   * Release the scroll lock on `target` (default `document.body`). The last
   * release clears the inline `overflow` (and `padding-right` if written) and
   * lets the CSS cascade take over.
   */
  unlock(target: HTMLElement = this.#document.body): void {
    if (!this.#isBrowser) {
      return;
    }
    const record = this.#targets.get(target);
    if (!record || record.count === 0) {
      return;
    }
    record.count--;
    if (record.count === 0) {
      target.style.overflow = '';
      if (record.wrotePaddingRight) {
        target.style.paddingRight = '';
        record.wrotePaddingRight = false;
      }
      this.#targets.delete(target);
    }
  }

  /**
   * True when any of the given elements reserves the scrollbar gutter via
   * `scrollbar-gutter: stable` (or `stable both-edges`). The gutter then
   * survives the `overflow: hidden` toggle, so no padding compensation is
   * needed.
   */
  #gutterIsStable(win: Window, els: readonly HTMLElement[]): boolean {
    for (const el of els) {
      const gutter = win.getComputedStyle(el).getPropertyValue('scrollbar-gutter');
      if (gutter.trim().split(/\s+/).includes('stable')) {
        return true;
      }
    }
    return false;
  }
}
