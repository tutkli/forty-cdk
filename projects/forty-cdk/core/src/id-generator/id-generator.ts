import {
  APP_ID,
  InjectionToken,
  Injectable,
  type Provider,
  inject,
  isDevMode,
} from '@angular/core';

import { fortyError } from '../errors/errors';

/**
 * Salt mixed into every id produced by {@link IdGenerator}.
 *
 * Defaults to `inject(APP_ID)` so the emitted ids are byte-identical to
 * Angular's application id out of the box — server and client renders of the
 * same app therefore agree, which is what hydration relies on.
 *
 * Override it per app with {@link provideForIdSalt} when running more than one
 * forty-cdk app on a single page, so each app's ids stay distinct without
 * having to change the global `APP_ID` (which also drives hydration store,
 * event replay, and other subsystems).
 *
 * Part of the blessed core tier: consumers import it from the
 * `forty-cdk/shared` entry point, which carries the library's semver
 * guarantee. Provide it directly only to read the resolved salt — to set one,
 * prefer {@link provideForIdSalt}.
 */
export const FOR_ID_SALT = new InjectionToken<string>('forty-cdk id salt', {
  providedIn: 'root',
  factory: () => inject(APP_ID),
});

/**
 * Provides a per-app salt for the ids forty-cdk primitives generate, without
 * touching the global `APP_ID`. Use this when mounting multiple forty-cdk apps
 * on one page so their `aria-controls` / `aria-labelledby` ids don't collide:
 *
 * ```ts
 * import { provideForIdSalt } from 'forty-cdk/shared';
 *
 * bootstrapApplication(AppA, { providers: [provideForIdSalt('a')] });
 * bootstrapApplication(AppB, { providers: [provideForIdSalt('b')] });
 * ```
 *
 * Without it both apps default their salt to `APP_ID` — Angular's default being the literal `'ng'`
 * — so they emit identical id sequences and the duplicate ids mis-resolve across app boundaries.
 *
 * The salt must be deterministic per app instance: a runtime random value would break SSR
 * hydration. It must not contain whitespace either: `aria-labelledby`, `aria-controls` and
 * `aria-describedby` are space-separated id lists, so a salted id with a space in it names two ids
 * that do not exist. In dev mode {@link IdGenerator} throws on such a salt.
 *
 * @param salt A stable, app-unique salt without whitespace.
 */
export function provideForIdSalt(salt: string): Provider {
  return { provide: FOR_ID_SALT, useValue: salt };
}

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
 * Mounting several apps on one page requires a distinct salt per app via {@link provideForIdSalt},
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
  if (isDevMode() && /\s/.test(salt)) {
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
