import { DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { attachScrollDismiss, type ScrollDismiss } from './scroll-dismiss';

/**
 * Application-scoped owner of the single document `scroll` listener shared by
 * every hover-driven anchored overlay (Tooltip, HoverCard).
 *
 * Each overlay used to call {@link attachScrollDismiss} in its own constructor,
 * so a table with one tooltip per row installed N capture-phase `scroll`
 * listeners on `document` that all fired on every scroll anywhere — even with
 * every tooltip closed. This dispatcher installs exactly one listener on the
 * first registration and removes it with the last, fanning each scroll out to
 * every registered `dismiss` callback and sharing a single suppression window.
 *
 * The refcounted install / teardown mirrors `ForToastManager`'s shared hotkey
 * listener. `providedIn: 'root'` so it is one instance per application injector
 * (garbage-collected with it, no listener leak between SSR requests); a
 * component-scoped `provideForTooltipDefaults` never re-provides it, so the
 * listener stays truly app-wide. Internal — not re-exported from
 * `public-api.ts` for consumers, only for the tooltip / hover-card entry points.
 */
@Injectable({ providedIn: 'root' })
export class ScrollDismissDispatcher {
  readonly #doc = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #subscribers = new Set<() => void>();
  #scrollDismiss: ScrollDismiss | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.#scrollDismiss?.destroy();
      this.#scrollDismiss = null;
      this.#subscribers.clear();
    });
  }

  /**
   * Whether an ancestor scroll has opened the shared suppression window. Overlay
   * open handlers bail while this returns `true` so content sliding under a
   * stationary pointer can't flicker overlays open. Always `false` on the
   * server and while no scroll listener is installed.
   */
  isSuppressed(): boolean {
    return this.#scrollDismiss?.isSuppressed() ?? false;
  }

  /**
   * Registers `dismiss` to run on every ancestor scroll. Installs the shared
   * listener on the first registration and returns a teardown that removes the
   * callback, tearing the listener down with the last registration. A no-op
   * returning an empty teardown on the server.
   *
   * @param dismiss Called on every ancestor scroll; implement it as a no-op
   *   when the overlay is neither open nor armed.
   * @returns A teardown to run from the caller's `DestroyRef` hook.
   */
  register(dismiss: () => void): () => void {
    if (!this.#isBrowser) {
      return () => {};
    }
    this.#subscribers.add(dismiss);
    if (!this.#scrollDismiss) {
      this.#scrollDismiss = attachScrollDismiss(this.#doc, {
        dismiss: () => {
          for (const fn of [...this.#subscribers]) {
            fn();
          }
        },
      });
    }
    return () => {
      this.#subscribers.delete(dismiss);
      if (this.#subscribers.size === 0) {
        this.#scrollDismiss?.destroy();
        this.#scrollDismiss = null;
      }
    };
  }
}
