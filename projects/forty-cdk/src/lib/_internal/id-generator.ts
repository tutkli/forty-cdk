import { Injectable } from '@angular/core';

/**
 * Generates unique string IDs scoped to the application instance.
 *
 * Used by primitives that need to wire `aria-controls` / `aria-labelledby`
 * relationships between pieces — the IDs are stable for the lifetime of the
 * primitive instance.
 *
 * SSR caveat: the counter lives in module scope on the client. Server / client
 * mount order can diverge, producing hydration mismatches. Revisit when SSR
 * support becomes a real requirement.
 */
@Injectable({ providedIn: 'root' })
export class IdGenerator {
  #counter = 0;

  /**
   * Returns a fresh, unique ID with the given prefix.
   *
   * @param prefix Optional prefix for the generated ID. Defaults to `for`.
   */
  next(prefix = 'for'): string {
    return `${prefix}-${++this.#counter}`;
  }
}
