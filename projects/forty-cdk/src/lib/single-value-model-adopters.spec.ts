/**
 * Meta-guard: every root whose `value` is a **single-value selection /
 * open-item model** declares it as `model<string | null>(null)` and adopts the
 * shared `assertSingleValueModelContract`.
 *
 * The family is derived from library source rather than declared, for the
 * reason `.claude/rules/testing.md` states over every guard in this folder: a
 * missing adopter is otherwise *invisible*, since the suite reports N green
 * primitives whether the roster lists N or N + 1. This family is the worked
 * example — the convention hand-enumerated four members for as long as it
 * existed, and `ForMenuRadioGroup` was the fifth: it shipped
 * `model<string>('')`, so a `[forMenuRadioItem] value=""` announced as checked
 * with nothing selected ([#1725](https://github.com/tutkli/forty-cdk/issues/1725)).
 *
 * The derived property is the one #1740 names: **the root declares a
 * `model<string…>` named `value`, and it is not array-backed.** It is not
 * exact — a free-text control has the same declaration and none of the
 * semantics — so the two that are not members are *declared* exclusions whose
 * condition the guard falsifies, which is the shape
 * `roving-tabindex-adopters.spec.ts` settled on for a near-exact property.
 *
 * Four things the guard asserts, and the third is the one that would have
 * caught #1725 on the day it shipped:
 *
 *   - Every member has a claim, and no claim names a file that stopped
 *     declaring the model.
 *   - Every claim names a root whose selector still exists.
 *   - **Every member's declaration is `model<string | null>(null)`** — the
 *     sentinel is `null`, spelled in both the type argument and the default.
 *     A source scan can state that outright, where the mount-based contract
 *     can only observe its consequences.
 *   - Each claim's spec calls the contract at least once per claim it makes.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface SingleValueModelAdopter {
  /** The root's selector, quoted in every failure this guard reports. */
  root: string;
  /** The file declaring the model, relative to `projects/forty-cdk/`. */
  source: string;
  /** The spec making the `assertSingleValueModelContract` call. */
  spec: string;
}

const ADOPTERS: readonly SingleValueModelAdopter[] = [
  {
    root: '[forTabs]',
    source: 'tabs/src/tabs.ts',
    spec: 'tabs/src/tabs.spec.ts',
  },
  {
    root: '[forRadioGroup]',
    source: 'radio-group/src/radio-group.ts',
    spec: 'radio-group/src/radio-group.spec.ts',
  },
  {
    root: '[forMenubar]',
    source: 'menubar/src/menubar.ts',
    spec: 'menubar/src/menubar.spec.ts',
  },
  {
    root: '[forNavigationMenu]',
    source: 'navigation-menu/src/navigation-menu.ts',
    spec: 'navigation-menu/src/navigation-menu.spec.ts',
  },
  {
    root: '[forMenuRadioGroup]',
    source: 'menu/src/menu-radio-group.ts',
    spec: 'menu/src/menu.spec.ts',
  },
];

/**
 * Declarations the derived property catches that are not members of the
 * family, with the reason — a **free-text** control, whose `value` is text the
 * user types rather than the identity of a sibling item. Nothing resolves its
 * selected state against the model, so there is no item for a sentinel to be
 * confused with and `''` is the correct rest value (an empty text box).
 *
 * The condition each entry is checked against is that the file declares
 * **neither** membership predicate — `isSelected(` nor `isOpen(` — which is
 * what every member of the family declares and what makes `''` ambiguous.
 * Mere existence is the weaker half: the day a text control starts resolving
 * sibling state against its value the reason stops holding while the
 * declaration does, and the exclusion would keep a real member out of the
 * contract with nothing red.
 */
const EXCLUSIONS: Readonly<Record<string, string>> = {
  'core/src/form-ui-control/text-value-control-base.ts':
    'free-text base for [forInput] / [forTextarea] / [forSearch] — its value is typed text, and no sibling resolves a selected state against it',
  'otp-input/src/otp-input.ts':
    'free-text one-time-code field — its value is the typed code, and no sibling resolves a selected state against it',
};

const pathOf = (key: string): string => key.replace(/^\/projects\/forty-cdk\//, '');

const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

const SPEC_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), source as string] as const);

const VALUE_MODEL = /\bvalue = model<([^>]*)>\(([^)]*)\)/;

/**
 * Source file → its `value = model<…>(…)` declaration, for the non-array
 * `string`-typed ones only. An array-backed model is the multi-capable
 * selection contract's subject and has no sentinel; a `D | null` date model
 * carries no empty-string ambiguity to resolve.
 */
function singleValueModelDeclarations(): Map<string, { type: string; initial: string }> {
  const declarations = new Map<string, { type: string; initial: string }>();
  for (const [path, source] of LIBRARY_SOURCES) {
    const match = source.match(VALUE_MODEL);
    if (match === null) {
      continue;
    }
    const type = match[1]!.trim();
    if (!/^string(\s*\|\s*null)?$/.test(type)) {
      continue;
    }
    declarations.set(path, { type, initial: match[2]!.trim() });
  }
  return declarations;
}

const familyMembers = (): Map<string, { type: string; initial: string }> =>
  new Map([...singleValueModelDeclarations()].filter(([path]) => EXCLUSIONS[path] === undefined));

/** Spec path → how many times it calls the contract. */
function contractCalls(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [path, source] of SPEC_SOURCES) {
    const count = (source.match(/assertSingleValueModelContract\(/g) ?? []).length;
    if (count > 0) {
      calls.set(path, count);
    }
  }
  return calls;
}

const declaredSelectors = (): Set<string> => {
  const selectors = new Set<string>();
  for (const [, source] of LIBRARY_SOURCES) {
    for (const match of source.matchAll(/selector:\s*'([^']+)'/g)) {
      selectors.add(match[1]!);
    }
  }
  return selectors;
};

const claimedSources = new Set(ADOPTERS.map((adopter) => adopter.source));
const claimsPerSpec = new Map<string, number>();
for (const adopter of ADOPTERS) {
  claimsPerSpec.set(adopter.spec, (claimsPerSpec.get(adopter.spec) ?? 0) + 1);
}
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('single-value model contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every root declaring a non-array string value model', () => {
    expect(singleValueModelDeclarations().size).toBeGreaterThanOrEqual(
      ADOPTERS.length + Object.keys(EXCLUSIONS).length,
    );
  });

  it('has a claim for every member of the family', () => {
    const missing = [...familyMembers().keys()].filter((path) => !claimedSources.has(path));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no file that stopped declaring a single-value model', () => {
    const declaring = singleValueModelDeclarations();
    const stale = [...claimedSources].filter((source) => !declaring.has(source));

    expect(sorted(stale)).toEqual([]);
  });

  it('names a root that still declares its selector', () => {
    const selectors = declaredSelectors();
    const unknown = ADOPTERS.filter((adopter) => !selectors.has(adopter.root)).map(
      (adopter) => adopter.root,
    );

    expect(sorted(new Set(unknown))).toEqual([]);
  });

  it('declares every member as model<string | null>(null)', () => {
    const wrong = [...familyMembers().entries()]
      .filter(([, declaration]) => declaration.type !== 'string | null')
      .map(([path, declaration]) => `${path}: model<${declaration.type}>`);

    expect(sorted(wrong)).toEqual([]);
  });

  it('seeds every member with the null sentinel, never the empty string', () => {
    const wrong = [...familyMembers().entries()]
      .filter(([, declaration]) => declaration.initial !== 'null')
      .map(([path, declaration]) => `${path}: model<…>(${declaration.initial})`);

    expect(sorted(wrong)).toEqual([]);
  });

  it('excludes no file whose exclusion condition stopped holding', () => {
    const declaring = singleValueModelDeclarations();
    const byPath = new Map(LIBRARY_SOURCES);

    const stale = Object.keys(EXCLUSIONS).flatMap((path) => {
      if (!declaring.has(path)) {
        return [`${path}: no longer declares a single-value model`];
      }
      const source = byPath.get(path) ?? '';
      const predicates = ['isSelected(', 'isOpen('].filter((predicate) =>
        source.includes(predicate),
      );
      return predicates.length === 0 ? [] : [`${path}: now declares ${predicates.join(', ')}`];
    });

    expect(sorted(stale)).toEqual([]);
  });

  it('has one contract call per claim in the spec that makes it', () => {
    const calls = contractCalls();

    const short = [...claimsPerSpec.entries()]
      .filter(([spec, claims]) => (calls.get(spec) ?? 0) < claims)
      .map(([spec, claims]) => `${spec}: ${claims} claim(s), ${calls.get(spec) ?? 0} call(s)`);

    expect(sorted(short)).toEqual([]);
  });
});
