import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  DestroyRef,
  Injectable,
  PLATFORM_ID,
  inject,
  signal,
  type Signal,
} from '@angular/core';

/**
 * Application-scoped tracker for the last input modality the user employed —
 * the in-house, CDK-free replacement for `@angular/cdk/a11y`'s `FocusMonitor`
 * modality detection. Created once per Angular bootstrap (one per SSR
 * request), tied to the root injector lifetime.
 *
 * It installs exactly **one** capture-phase `keydown` and **one** capture-phase
 * `pointerdown` listener on `document`, regardless of how many primitives read
 * its state — every `injectFocusVisible()` consumer shares this single
 * singleton, so the document is never listened to more than once. Capture phase
 * is used so the modality is settled before any overlay content can stop
 * propagation.
 *
 * Why a service rather than module-level state:
 *
 * - SSR isolation: module-level globals leak between simultaneous server
 *   requests in the same Node process. A `providedIn: 'root'` service is
 *   instantiated per application injector.
 * - Bootstrap-safety: `TestBed.resetTestingModule()`, micro-frontend reloads,
 *   and anything else that destroys `ApplicationRef` must not leave stale
 *   `document` listeners behind. The listeners are registered in the
 *   constructor and removed via `DestroyRef`.
 * - SSR safety: `document` is inaccessible on the server. The service is a
 *   no-op when `PLATFORM_ID` is not the browser; `keyboard` stays `false` and
 *   no listener is installed.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
@Injectable({ providedIn: 'root' })
export class InputModality {
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #keyboard = signal(false);

  /**
   * `true` when the most recent input modality was the keyboard, `false` after
   * a pointer interaction (or before any interaction). Stays `false` on the
   * server.
   */
  readonly keyboard: Signal<boolean> = this.#keyboard.asReadonly();

  readonly #onKeyDown = (): void => {
    this.#keyboard.set(true);
  };
  readonly #onPointerDown = (): void => {
    this.#keyboard.set(false);
  };

  constructor() {
    if (!this.#isBrowser) {
      return;
    }
    this.#document.addEventListener('keydown', this.#onKeyDown, true);
    this.#document.addEventListener('pointerdown', this.#onPointerDown, true);

    inject(DestroyRef).onDestroy(() => {
      this.#document.removeEventListener('keydown', this.#onKeyDown, true);
      this.#document.removeEventListener('pointerdown', this.#onPointerDown, true);
    });
  }
}
