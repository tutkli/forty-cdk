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
 * Why: any code (route transition, theme toggle, the consumer themselves)
 * that mutates `target.style.overflow` between `lock()` and the final
 * `unlock()` would otherwise be silently clobbered when we restored the
 * stale snapshot. Clearing on unlock means the lock owns the inline style
 * only while it exists; intervening mutations win, and the resting state
 * is whatever stylesheet rules apply.
 *
 * **The page lock reaches the viewport.** Body overflow scrolls the viewport
 * only while `<html>` declares none of its own, so when `<html>` computes a
 * scrollable overflow (`html { overflow-y: scroll }`) the body lock also
 * writes `overflow: hidden` on `<html>`, and clears it on the final unlock
 * under the same contract.
 *
 * **Compensation is measured, not assumed.** The lock reads the width of the
 * scrolling box (`documentElement.clientWidth` for the body path, the
 * target's own `clientWidth` for an element) before and after writing
 * `overflow: hidden`, and pads the target by exactly the width the hidden
 * scrollbar gave back. Borders never count. When nothing is given back (an
 * overlay-scrollbar platform, a page that does not overflow), or when
 * `scrollbar-gutter: stable` keeps the space reserved, no `padding-right` is
 * written, so a consumer's unrelated inline `padding-right` survives the
 * lock. A container whose width is fixed under `box-sizing: content-box`
 * grows by the compensation rather than absorbing it.
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

  readonly #targets = new Map<
    HTMLElement,
    { count: number; wrotePaddingRight: boolean; wroteRootOverflow: boolean }
  >();

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
      record = { count: 0, wrotePaddingRight: false, wroteRootOverflow: false };
      this.#targets.set(target, record);
    }
    if (record.count === 0) {
      const root = this.#document.documentElement;
      const isBody = target === this.#document.body;
      const scroller = isBody ? root : target;
      const win = this.#window;
      const widthBefore = scroller.clientWidth;
      const paddingRight = win ? parseFloat(win.getComputedStyle(target).paddingRight) || 0 : 0;
      const lockRoot = isBody && win !== null && this.#scrollsViewport(win, root);
      const gutterIsStable =
        win !== null && this.#gutterIsStable(win, isBody ? [root, target] : [target]);

      target.style.overflow = 'hidden';
      if (lockRoot) {
        root.style.overflow = 'hidden';
        record.wroteRootOverflow = true;
      }

      const scrollbarWidth = scroller.clientWidth - widthBefore;
      if (scrollbarWidth > 0 && !gutterIsStable) {
        target.style.paddingRight = `${paddingRight + scrollbarWidth}px`;
        record.wrotePaddingRight = true;
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
      if (record.wroteRootOverflow) {
        this.#document.documentElement.style.overflow = '';
      }
      if (record.wrotePaddingRight) {
        target.style.paddingRight = '';
      }
      this.#targets.delete(target);
    }
  }

  /**
   * True when any of the given elements reserves the scrollbar gutter via
   * `scrollbar-gutter: stable` (or `stable both-edges`). The gutter then
   * survives the `overflow: hidden` toggle, so no padding compensation is
   * needed, even though `clientWidth` reports the reserved space as freed.
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

  #scrollsViewport(win: Window, root: HTMLElement): boolean {
    const style = win.getComputedStyle(root);
    return [style.overflowX, style.overflowY].some(
      (value) => value === 'auto' || value === 'scroll',
    );
  }
}
