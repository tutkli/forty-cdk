import { DOCUMENTED_DATA_STATE_VOCABULARIES } from '../test-utils/contract';

/**
 * Meta-guard: every entry point whose pieces bind `'[attr.data-state]'` to a
 * **literal** value set adopts the shared `data-state` contract, and every
 * value set they emit is one of the documented vocabularies.
 *
 * Both halves are derived from library source rather than declared here, for
 * the reason `form-control-adopters.spec.ts` and
 * `core/src/defaults/per-primitive-defaults.spec.ts` were written: a missing
 * adopter is *invisible* otherwise. The suite reports N green primitives
 * whether the roster lists N or N + 1, so the twenty-fifth `data-state`
 * emitter would ship uncovered and nothing would turn red — which is exactly
 * how the hand-maintained form-control roster lost four primitives.
 *
 * The extraction below is the one `scripts/lib/convention-matrices.mjs` runs
 * to generate the `data-state` rows of the matrices in
 * `.claude/rules/conventions.md`: same brace-matched `host: { … }` block, same
 * binding lookup, same literal scan. That is what "the docs gate and the test
 * gate agree" means here — not that this spec parses the generated table, but
 * that both gates fold the same source fact, so a new vocabulary cannot
 * satisfy one and slip past the other. `pnpm check:matrices` fails on the
 * table it would change; this spec fails on the family nothing documents.
 *
 * Two deliberate scope notes:
 *
 *   - The glob covers **every** entry point's `src/`, `forty-cdk/core`
 *     included, which is a superset of the matrices script's set (that one
 *     excludes core, whose internal tier the consumer-facing conventions do
 *     not govern). Core emits no `data-state` today; if a core piece ever
 *     does, this guard asks it for the same declaration.
 *   - Only a literal value set is covered. A `data-state` delegated to a
 *     signal or method keeps its vocabulary in the delegate's own type, which
 *     no source scan can read — the same boundary the matrix draws with its
 *     `data-state` computed by a signal / method row. An entry point on both
 *     sides of it (Drawer, NavigationMenu, Stepper, Tree, …) adopts for its
 *     literal pieces and is covered here on their behalf.
 *
 * The first two cases below are liveness probes over the extraction itself: a
 * mis-typed glob returns an empty record and an extraction that stopped
 * matching reports zero emitters, either of which would make the adoption
 * assertion pass for the wrong reason.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * Entry points whose literal `data-state` emission is deliberately not the
 * contract's business, with the reason. An exclusion is a named condition
 * rather than a silent omission, so a primitive cannot be parked here and a
 * reader can check the claim against the source.
 *
 * The last case below fails on a stale entry, and it checks the **condition**
 * rather than mere existence: the entry point must still emit a literal
 * vocabulary *and* every set it emits must still be single-state, which is
 * what "no second state to distinguish" means. Existence alone is the weaker
 * half — the day `[forToast]` gains a `closed` the reason stops holding while
 * the emission does, and the exclusion would keep a two-state vocabulary out
 * of the contract with nothing red. That is the failure mode the SSR
 * registry's `noWiring` strings have (the reason keeps reading plausibly long
 * after the source it describes changed).
 */
const EXCLUSIONS: Readonly<Record<string, string>> = {
  toast:
    '[forToast] binds the constant \'"open"\' — mount is open for a toast, so the sweep has no second state to distinguish',
};

const entryPointOf = (key: string): string =>
  key.replace(/^\/projects\/forty-cdk\//, '').split('/')[0]!;

/**
 * The `host: { … }` metadata block of a decorator, or `null` when the file
 * declares none. Brace-matched rather than regexed so a nested object literal
 * (a `'[style.--for-x]'` map, an `imports: [...]` array) cannot truncate it.
 */
function hostBlock(text: string): string | null {
  const start = text.indexOf('host: {');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start + 'host: '.length; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/** The expression bound to `'[attr.data-state]'`, or `null` when unbound. */
function dataStateBinding(text: string): string | null {
  const block = hostBlock(text);
  if (block === null) {
    return null;
  }
  const match = block.match(/'\[attr\.data-state\]':\s*(?:'([^']*)'|"([^"]*)")/);
  if (match === null) {
    return null;
  }
  return match[1] ?? match[2] ?? null;
}

/** Entry point → the sorted literal value sets its pieces emit. */
function literalVocabulariesByEntryPoint(): Map<string, Set<string>> {
  const byEntryPoint = new Map<string, Set<string>>();
  for (const [key, source] of Object.entries(SOURCES)) {
    if (key.endsWith('.spec.ts')) {
      continue;
    }
    const expression = dataStateBinding(source);
    if (expression === null) {
      continue;
    }
    const literals = [...expression.matchAll(/["']([a-z-]+)["']/g)].map((m) => m[1]!);
    if (literals.length === 0) {
      continue;
    }
    const entryPoint = entryPointOf(key);
    const sets = byEntryPoint.get(entryPoint) ?? new Set<string>();
    sets.add([...new Set(literals)].sort().join('|'));
    byEntryPoint.set(entryPoint, sets);
  }
  return byEntryPoint;
}

function entryPointsAdoptingTheContract(): Set<string> {
  const adopting = new Set<string>();
  for (const [key, source] of Object.entries(SOURCES)) {
    if (key.endsWith('.spec.ts') && source.includes('assertDataStateContract(')) {
      adopting.add(entryPointOf(key));
    }
  }
  return adopting;
}

const documented = new Set(
  DOCUMENTED_DATA_STATE_VOCABULARIES.map((vocabulary) => [...vocabulary].sort().join('|')),
);

describe('data-state contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every entry point that emits a literal data-state vocabulary', () => {
    expect(literalVocabulariesByEntryPoint().size).toBeGreaterThanOrEqual(24);
  });

  it('emits only documented data-state vocabularies', () => {
    const undocumented = [...literalVocabulariesByEntryPoint().entries()]
      .flatMap(([entryPoint, sets]) => [...sets].map((set) => ({ entryPoint, set })))
      .filter(({ set }) => !documented.has(set))
      .map(({ entryPoint, set }) => `${entryPoint}: ${set}`);

    expect(undocumented).toEqual([]);
  });

  it('has an assertDataStateContract call in every emitting entry point', () => {
    const adopting = entryPointsAdoptingTheContract();

    const missing = [...literalVocabulariesByEntryPoint().entries()]
      .filter(([entryPoint]) => !adopting.has(entryPoint))
      .filter(([entryPoint]) => EXCLUSIONS[entryPoint] === undefined)
      .map(([entryPoint, sets]) => `${entryPoint} (${[...sets].join(', ')})`);

    expect(missing).toEqual([]);
  });

  it('excludes no entry point whose exclusion condition stopped holding', () => {
    const emitting = literalVocabulariesByEntryPoint();

    const stale = Object.keys(EXCLUSIONS).flatMap((entryPoint) => {
      const sets = emitting.get(entryPoint);
      if (sets === undefined) {
        return [`${entryPoint}: no longer emits a literal vocabulary`];
      }
      const multiState = [...sets].filter((set) => set.includes('|'));
      return multiState.length === 0 ? [] : [`${entryPoint}: now emits ${multiState.join(', ')}`];
    });

    expect(stale).toEqual([]);
  });
});
