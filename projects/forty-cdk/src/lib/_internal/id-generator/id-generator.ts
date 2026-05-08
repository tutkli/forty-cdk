import { APP_ID, Injectable, inject } from '@angular/core';

/**
 * Generates unique string IDs scoped to the application instance.
 *
 * Used by primitives that need to wire `aria-controls` / `aria-labelledby`
 * relationships between pieces — the IDs are stable for the lifetime of the
 * primitive instance.
 *
 * SSR: the generator is `providedIn: 'root'`, so a fresh instance is
 * created for each Angular application bootstrap (one per SSR request).
 * The IDs are salted with the application's `APP_ID` so server and client
 * produce identical strings for the same render order and identical apps
 * mounted side-by-side don't collide.
 */
@Injectable({ providedIn: 'root' })
export class IdGenerator {
  readonly #appId = inject(APP_ID);
  #counter = 0;

  /**
   * Returns a fresh, unique ID with the given prefix.
   *
   * @param prefix Optional prefix for the generated ID. Defaults to `for`.
   */
  next(prefix = 'for'): string {
    return `${prefix}-${this.#appId}-${++this.#counter}`;
  }
}
