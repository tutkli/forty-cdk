import { type InjectionToken, Optional, type Provider, SkipSelf } from '@angular/core';

/**
 * Builds the providers of a `provideFor<X>Defaults(overrides)` call. Every
 * defaults pair in the library routes its provider through this one merge, so
 * the inheritance semantics stay identical everywhere — the convention is
 * documented in `CLAUDE.md` under "Defaults providers".
 *
 * Each pair declares its own token as a top-level
 * `new InjectionToken<D>(name, { providedIn: 'root', factory: () => fallback })`,
 * the one shape bundlers drop when it is unused. A helper call returning the
 * token would be kept as a side effect, so importing any one pair from
 * `forty-cdk/defaults` would keep all of them.
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
 * - `overrides` may instead be a function returning them. It is called inside
 *   the provider factory, so it can `inject()`, once per injector that
 *   resolves the token.
 * - A key listed in `recordKeys` holds a per-part record (`segmentLabels`,
 *   `placeholder`) and merges one level deeper: per entry, the same
 *   overrides-over-parent-over-fallback order applies, so a scope overriding
 *   one entry keeps every entry an ancestor scope set.
 * - Returns a `Provider[]` so callers can spread additional providers
 *   (e.g. a per-scope coordinator class) into the same array.
 *
 * @param token The pair's token, whose root factory returns `fallback`.
 * @param fallback Library defaults, merged under every scope. Returned by
 *   reference at the root, so don't mutate it.
 * @param overrides The scope's partial overrides, or a factory building them.
 * @param recordKeys Keys whose values are records merged entry by entry.
 */
export function provideDefaults<D extends object>(
  token: InjectionToken<D>,
  fallback: D,
  overrides: Partial<D> | (() => Partial<D>) = {},
  recordKeys: readonly (keyof D)[] = [],
): Provider[] {
  return [
    {
      provide: token,
      useFactory: (parent: D | null): D =>
        mergeDefaults(
          typeof overrides === 'function' ? (overrides as () => Partial<D>)() : overrides,
          parent,
          fallback,
          recordKeys,
        ),
      deps: [[new SkipSelf(), new Optional(), token]],
    },
  ];
}

function mergeDefaults<D extends object>(
  overrides: Partial<D>,
  parent: D | null,
  fallback: D,
  recordKeys: readonly (keyof D)[],
): D {
  const result = { ...fallback } as D;
  // Parent already merged its own overrides over the fallback, so it wins
  // over the library fallback for any key it owns.
  if (parent) {
    for (const key of Object.keys(parent) as (keyof D)[]) {
      const value = parent[key];
      if (value !== undefined) {
        result[key] = recordKeys.includes(key)
          ? (mergeRecord(result[key], value) as D[keyof D])
          : value;
      }
    }
  }
  // Overrides win over both parent and fallback for the keys they list.
  for (const key of Object.keys(overrides) as (keyof D)[]) {
    const value = overrides[key] as D[keyof D] | undefined;
    if (value !== undefined) {
      result[key] = recordKeys.includes(key)
        ? (mergeRecord(result[key], value) as D[keyof D])
        : value;
    }
  }
  return result;
}

function mergeRecord(base: unknown, layer: unknown): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(base as object) };
  for (const [entry, value] of Object.entries(layer as object)) {
    if (value !== undefined) {
      merged[entry] = value;
    }
  }
  return merged;
}
