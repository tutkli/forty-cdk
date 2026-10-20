import { Injectable, inject } from '@angular/core';

import { FOR_ID_SALT } from 'forty-cdk/id-salt';

import { fortyError } from '../errors/errors';

/**
 * Generates unique string IDs scoped to the application instance.
 *
 * Backs the `aria-controls` / `aria-labelledby` wiring between a primitive's pieces. Ids are stable
 * for the lifetime of the instance that minted them.
 *
 * Scoped to the application injector, so each bootstrap — and each SSR request — starts a fresh
 * counter. Ids are salted with {@link FOR_ID_SALT}, defaulting to `APP_ID`, so a server and client
 * render of the same order produce identical strings.
 *
 * Because the counter is monotonic, that agreement is a property of the render order rather than of
 * any single id. Ordinary hydration replays the server's order; incremental hydration does not, so
 * an id minted by a deferred root for a piece that is still dehydrated can keep a drifted value.
 * Keeping a primitive's pieces in one hydration unit avoids it, and is documented for consumers
 * under "Incremental hydration" in the `forty-cdk/shared` README.
 *
 * Mounting several apps on one page requires a distinct salt per app via `provideForIdSalt`,
 * or they emit colliding ids.
 */
@Injectable({ providedIn: 'root' })
export class IdGenerator {
  readonly #salt = inject(FOR_ID_SALT);
  #counter = 0;

  /**
   * Returns a fresh, unique ID with the given prefix. In dev mode, throws when the salt contains
   * whitespace.
   *
   * @param prefix Optional prefix for the generated ID. Defaults to `for`.
   */
  next(prefix = 'for'): string {
    assertIdSalt(this.#salt);
    return `${prefix}-${this.#salt}-${++this.#counter}`;
  }
}

function assertIdSalt(salt: string): void {
  if ((typeof ngDevMode === 'undefined' || ngDevMode) && /\s/.test(salt)) {
    throw fortyError({
      code: 'FORCDK-CORE-012',
      message: `The id salt "${salt}" contains whitespace.`,
      cause:
        'Generated ids are referenced from aria-labelledby, aria-controls and aria-describedby, ' +
        'which are space-separated id lists, so an id with a space in it resolves to two ids ' +
        'that do not exist.',
      fix: 'Pass provideForIdSalt() (or FOR_ID_SALT) a salt without whitespace, e.g. "admin-panel".',
    });
  }
}
