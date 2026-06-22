import { InjectionToken, Optional, type Provider, SkipSelf } from '@angular/core';

/**
 * Internal helper that builds the canonical defaults pair for a primitive:
 * an `InjectionToken<D>` and a paired `provideFor<X>Defaults(overrides)`
 * function. Every primitive in the library that exposes injector-scoped
 * defaults uses this — the convention is documented in `CLAUDE.md` under
 * "Defaults providers".
 *
 * Behavior of the generated provider function:
 *
 * - Reads the parent value of the same token via
 *   `[[new SkipSelf(), new Optional(), TOKEN]]` so each call inherits
 *   ancestor scopes.
 * - Per key, the value present-and-not-`undefined` in `overrides` wins, else
 *   the parent's value (when not `undefined`), else the library `fallback`.
 *   Only `undefined` is treated as "key omitted" — a deliberate `null` (or any
 *   other defined value) in `overrides` or `parent` is a real override and is
 *   kept. The parent's already-merged value beats the library fallback, which
 *   means a component-level `provideFor<X>Defaults({ a: 1 })` overlaid on an
 *   app-level `provideFor<X>Defaults({ a: 0, b: 2 })` resolves to
 *   `{ a: 1, b: 2 }` — partial overrides only touch the keys they list.
 * - Returns a `Provider[]` so callers can spread additional providers
 *   (e.g. a per-scope coordinator class) into the same array.
 *
 * The helper is internal — primitives re-export their generated
 * `provideFor<X>Defaults` and (when public) their token. Internal — not
 * re-exported from `public-api.ts`.
 *
 * @param name Display name of the token (used as the InjectionToken's
 *   description, e.g. `'FOR_TOOLTIP_DEFAULTS'`).
 * @param fallback Library defaults — read at the root of the injector tree
 *   when no consumer has called the provider helper. Returned by reference,
 *   so don't mutate it.
 */
export function createDefaults<D extends object>(
  name: string,
  fallback: D,
): {
  /** Token consumers inject to read the resolved defaults for the current scope. */
  token: InjectionToken<D>;
  /** Provider factory that merges overrides with the parent scope and the fallback. */
  provideDefaults: (overrides?: Partial<D>) => Provider[];
} {
  const token = new InjectionToken<D>(name, {
    providedIn: 'root',
    factory: () => fallback,
  });

  const provideDefaults = (overrides: Partial<D> = {}): Provider[] => [
    {
      provide: token,
      useFactory: (parent: D | null): D => mergeDefaults(overrides, parent, fallback),
      deps: [[new SkipSelf(), new Optional(), token]],
    },
  ];

  return { token, provideDefaults };
}

function mergeDefaults<D extends object>(overrides: Partial<D>, parent: D | null, fallback: D): D {
  const result = { ...fallback } as D;
  // Parent already merged its own overrides over the fallback, so it wins
  // over the library fallback for any key it owns.
  if (parent) {
    for (const key of Object.keys(parent) as (keyof D)[]) {
      const value = parent[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
  }
  // Overrides win over both parent and fallback for the keys they list.
  for (const key of Object.keys(overrides) as (keyof D)[]) {
    const value = overrides[key];
    if (value !== undefined) {
      result[key] = value as D[keyof D];
    }
  }
  return result;
}
