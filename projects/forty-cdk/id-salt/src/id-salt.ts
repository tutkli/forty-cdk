import { APP_ID, InjectionToken, type Provider, inject } from '@angular/core';

/**
 * Salt mixed into every id the forty-cdk primitives generate.
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
 * Provide it directly only to read the resolved salt — to set one, prefer
 * {@link provideForIdSalt}.
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
 * import { provideForIdSalt } from 'forty-cdk/id-salt';
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
 * that do not exist. In dev mode generating an id throws `FORCDK-CORE-012` on such a salt.
 *
 * @param salt A stable, app-unique salt without whitespace.
 */
export function provideForIdSalt(salt: string): Provider {
  return { provide: FOR_ID_SALT, useValue: salt };
}
