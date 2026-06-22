import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Refcounted `document.visibilitychange` subscription. Multiple toasts
 * (or any other primitive that wants to pause work while the page is in
 * the background) call `subscribe` independently — only the first
 * subscribe attaches the listener, only the last unsubscribe removes it.
 *
 * Each subscriber receives `true` while `document.visibilityState !== 'visible'`
 * (the page is hidden / backgrounded) and `false` when it becomes visible
 * again. Subscribers are not invoked synchronously on subscribe — they
 * only fire on transitions, so register them in a context where the
 * primitive's "visible" state is the implicit starting point.
 *
 * SSR: `providedIn: 'root'` so the listener set is scoped to one Angular
 * bootstrap. Server-side calls return a no-op unsubscribe.
 */
type VisibilityListener = (hidden: boolean) => void;

@Injectable({ providedIn: 'root' })
export class VisibilityPause {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly #listeners = new Set<VisibilityListener>();
  #domListener: (() => void) | null = null;

  constructor() {
    if (!this.#isBrowser) {
      return;
    }
    inject(DestroyRef).onDestroy(() => {
      this.#detachDomListener();
      this.#listeners.clear();
    });
  }

  /**
   * Whether the page is currently hidden / backgrounded
   * (`document.visibilityState !== 'visible'`). Returns `false` on the
   * server. Use this to seed initial pause state, since `subscribe` only
   * fires on transitions and never synchronously on subscribe.
   */
  currentlyHidden(): boolean {
    return this.#isBrowser ? this.#document.visibilityState !== 'visible' : false;
  }

  subscribe(listener: VisibilityListener): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    if (this.#listeners.size === 0) {
      this.#attachDomListener();
    }
    this.#listeners.add(listener);

    return (): void => {
      if (!this.#listeners.delete(listener)) {
        return;
      }
      if (this.#listeners.size === 0) {
        this.#detachDomListener();
      }
    };
  }

  #attachDomListener(): void {
    this.#domListener = (): void => {
      const hidden = this.#document.visibilityState !== 'visible';
      for (const fn of this.#listeners) {
        fn(hidden);
      }
    };
    this.#document.addEventListener('visibilitychange', this.#domListener);
  }

  #detachDomListener(): void {
    if (this.#domListener) {
      this.#document.removeEventListener('visibilitychange', this.#domListener);
      this.#domListener = null;
    }
  }
}

/**
 * Convenience wrapper that resolves the application-scoped
 * `VisibilityPause` and subscribes. Must be called from an injection
 * context.
 */
export function subscribeVisibilityPause(listener: VisibilityListener): () => void {
  return inject(VisibilityPause).subscribe(listener);
}

/**
 * Convenience wrapper that resolves the application-scoped
 * `VisibilityPause` and reports whether the page is currently hidden.
 * Must be called from an injection context. Returns `false` on the server.
 */
export function isPageHidden(): boolean {
  return inject(VisibilityPause).currentlyHidden();
}
