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
 * The IDs are salted with the application's `APP_ID` so the server and the
 * client produce identical strings for the same render order — the property
 * hydration relies on.
 *
 * IMPORTANT — multiple apps on one page require distinct `APP_ID`s. The salt
 * is `APP_ID`, and Angular's default `APP_ID` is the literal `'ng'`. Two
 * forty-cdk apps mounted side-by-side that both keep the default `APP_ID`
 * therefore start from the same salt and the same counter, emitting identical
 * id sequences — duplicate DOM ids that mis-resolve `aria-labelledby` /
 * `aria-controls` across apps. A per-instance random nonce is deliberately
 * NOT mixed in: it would diverge the salt but break SSR hydration (the server
 * and client renders would no longer agree). When running more than one
 * forty-cdk app on a single page, give each a distinct `APP_ID` via
 * `{ provide: APP_ID, useValue: '<unique>' }` (or `bootstrapApplication`'s
 * `appId`). This is the standard Angular requirement for co-located apps.
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
