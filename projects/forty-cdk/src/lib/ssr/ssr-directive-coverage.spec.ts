import { type Type } from '@angular/core';

import { publicDirectiveRoster } from '../../test-utils/source-scan';

import { SSR_FIXTURES } from './fixtures/registry';

/**
 * Whether the SSR smoke suite renders every public directive at all.
 *
 * The sweeps in `ssr.spec.ts` assert everything about the fixtures they are
 * given and nothing about the directives no fixture mounts, so a directive
 * outside every fixture can gain an ungated layout read or drop a server-side
 * pairing with the suite still green. This spec derives the public roster from
 * the barrels and the rendered set from the compiled fixtures, and fails on a
 * directive in the first and not the second.
 *
 * The rendered set is read from each registered fixture's compiled
 * `ɵcmp.dependencies`, followed through every component it renders and every
 * host directive a rendered directive composes, so a directive a fixture
 * imports but never uses in its template is not counted as covered.
 */

interface CompiledDef {
  readonly dependencies?: readonly unknown[] | (() => readonly unknown[]) | null;
  readonly hostDirectives?: readonly unknown[] | null;
}

/**
 * The directives with nothing to emit server-side, each with the reason. An
 * entry is checked in both directions: it must still be exported, and no
 * registered fixture may render it, or the excuse has outlived its reason.
 */
const NOT_SERVER_RENDERED: ReadonlyMap<string, string> = new Map<string, string>([]);

function compiledDef(type: unknown): CompiledDef | undefined {
  if (typeof type !== 'function') return undefined;
  const record = type as unknown as Record<string, CompiledDef | undefined>;
  return record['ɵcmp'] ?? record['ɵdir'];
}

function resolveList<T>(
  list: readonly T[] | (() => readonly T[]) | null | undefined,
): readonly T[] {
  if (list === null || list === undefined) return [];
  return typeof list === 'function' ? list() : list;
}

/**
 * The class name a compiled type was declared with. The test build lowers a
 * class carrying static fields to `const _X = class _X`, so a leading
 * underscore is the bundler's, not the library's.
 */
function declaredName(type: Type<unknown>): string {
  return type.name.replace(/^_+/, '');
}

function renderedDirectives(roots: readonly Type<unknown>[]): ReadonlySet<string> {
  const seen = new Set<unknown>();
  const names = new Set<string>();
  const queue: unknown[] = [...roots];
  while (queue.length > 0) {
    const type = queue.pop();
    if (seen.has(type)) continue;
    seen.add(type);
    const def = compiledDef(type);
    if (def === undefined) continue;
    names.add(declaredName(type as Type<unknown>));
    queue.push(...resolveList(def.dependencies));
    for (const entry of resolveList(def.hostDirectives)) {
      queue.push(...hostDirectiveTypes(entry));
    }
  }
  return names;
}

/**
 * The directive types one `hostDirectives` entry of a compiled definition
 * names. Angular stores an eager entry as `{ directive }` and keeps a lazy one
 * as the thunk itself, which returns the raw list: types or `{ directive }`.
 */
function hostDirectiveTypes(entry: unknown): readonly unknown[] {
  if (typeof entry === 'function' && compiledDef(entry) === undefined) {
    return (entry as () => readonly unknown[])().flatMap(hostDirectiveTypes);
  }
  if (typeof entry === 'object' && entry !== null && 'directive' in entry) {
    return [entry.directive];
  }
  return [entry];
}

describe('SSR smoke suite directive coverage', () => {
  const roster = publicDirectiveRoster();
  const exported = new Set(roster.map(({ name }) => name));
  const rendered = renderedDirectives(SSR_FIXTURES.map(({ component }) => component));

  it('derives the public directive roster from the barrels and the rendered set from the fixtures', () => {
    expect(roster.length, 'the roster found almost no public directive').toBeGreaterThan(250);
    expect(
      roster.filter(({ name }) => rendered.has(name)).length,
      'the rendered set matches almost no roster name, so the compiled class names were read wrong',
    ).toBeGreaterThan(250);
    expect(
      ['ForDialogTrigger', 'ForTableBody', 'ForVisuallyHidden'].filter(
        (name) => !exported.has(name),
      ),
      'a directive, a component and a class published from another entry point must all be found',
    ).toEqual([]);
    expect(
      ['ForDialogManager', 'ForDialogRef', 'FOR_DIALOG_CONTEXT'].filter((name) =>
        exported.has(name),
      ),
      'a manager, a ref and a token are not directives',
    ).toEqual([]);
  });

  it('renders every public directive in a registered fixture', () => {
    const missing = roster
      .filter(({ name }) => !rendered.has(name) && !NOT_SERVER_RENDERED.has(name))
      .map(({ name, source }) => `${name} (${source})`);

    expect(
      missing,
      'a public directive no registered SSR fixture renders — mount it in a fixture with `markup` claims, or list it in NOT_SERVER_RENDERED with the reason it emits nothing server-side',
    ).toEqual([]);
  });

  it('lists in NOT_SERVER_RENDERED only exported directives no fixture renders', () => {
    const stale = [...NOT_SERVER_RENDERED.keys()].filter(
      (name) => !exported.has(name) || rendered.has(name),
    );

    expect(
      stale,
      'an allowlisted directive is now rendered by a fixture or no longer exported — drop the entry',
    ).toEqual([]);
  });
});
