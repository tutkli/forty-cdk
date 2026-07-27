import { APP_ID, InjectionToken, Injectable, type Provider, inject } from '@angular/core';

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
 * Without this, both apps default their salt to `APP_ID` — whose Angular
 * default is the literal `'ng'` — so they start from the same salt and the
 * same counter and emit identical id sequences. The duplicate ids then
 * mis-resolve `aria-labelledby` / `aria-controls` to whichever element comes
 * first in the document, which a screen reader announces across app
 * boundaries.
 *
 * The salt must stay deterministic per app instance — a runtime random value
 * would break SSR hydration because the server and client renders would no
 * longer agree.
 *
 * Part of the blessed core tier: consumers import it from the
 * `forty-cdk/shared` entry point, which carries the library's semver
 * guarantee.
 *
 * @param salt A stable, app-unique salt.
 */
export function provideForIdSalt(salt: string): Provider {
  return { provide: FOR_ID_SALT, useValue: salt };
}

/**
 * Generates unique string IDs scoped to the application instance.
 *
 * Used by primitives that need to wire `aria-controls` / `aria-labelledby`
 * relationships between pieces — the IDs are stable for the lifetime of the
 * primitive instance.
 *
 * SSR: the generator is `providedIn: 'root'`, so a fresh instance is
 * created for each Angular application bootstrap (one per SSR request).
 * The IDs are salted with {@link FOR_ID_SALT} (which defaults to the
 * application's `APP_ID`) so the server and the client produce identical
 * strings for the same render order — the property hydration relies on.
 *
 * IMPORTANT — multiple apps on one page need distinct salts. The default salt
 * is `APP_ID`, and Angular's default `APP_ID` is the literal `'ng'`. Two
 * forty-cdk apps mounted side-by-side that both keep the default salt
 * therefore start from the same salt and the same counter, emitting identical
 * id sequences — duplicate DOM ids that mis-resolve `aria-labelledby` /
 * `aria-controls` across apps. A per-instance random nonce is deliberately
 * NOT mixed in: it would diverge the salt but break SSR hydration (the server
 * and client renders would no longer agree). When running more than one
 * forty-cdk app on a single page, give each a distinct salt via
 * {@link provideForIdSalt} (the per-app knob that leaves the global `APP_ID`
 * untouched). Overriding the global `APP_ID` works too, but it also drives
 * Angular's hydration store and event replay, so `provideForIdSalt` is the
 * narrower choice.
 *
 * The generator itself stays internal tier while {@link FOR_ID_SALT} and
 * {@link provideForIdSalt} are blessed: a consumer configures the salt, but
 * never mints ids — every id belongs to a primitive's aria wiring, so
 * publishing `next()` would commit the library to an id format it wants to
 * stay free to change (#1492).
 */
@Injectable({ providedIn: 'root' })
export class IdGenerator {
  readonly #salt = inject(FOR_ID_SALT);
  #counter = 0;

  /**
   * Returns a fresh, unique ID with the given prefix.
   *
   * @param prefix Optional prefix for the generated ID. Defaults to `for`.
   */
  next(prefix = 'for'): string {
    return `${prefix}-${this.#salt}-${++this.#counter}`;
  }
}
