import { assertDefaultsKeyParity, type DefaultsKeyFamily } from '../test-utils/contract';
import { entryPointOf, LIBRARY_CODE, LIBRARY_SOURCES } from '../test-utils/source-scan';

/**
 * Meta-guard for defaults-key parity: the families whose members expose one
 * shared vocabulary on their `For<Primitive>Defaults` interface, and the
 * declaration of who is in each.
 *
 * `defaults/src/per-primitive-defaults.spec.ts` covers each provider on its
 * own — the fallback resolves, an override merges per key — and derives the
 * provider set from source so a fortieth cannot go uncovered. What it cannot see
 * is a family drifting: a tunable added to one member and not its siblings, or
 * added under a second spelling. This guard is the cross-primitive half, and the
 * shape is the one `.claude/rules/testing.md` prescribes — the grouping is
 * declared because no scan can infer it, and **everything about the members is
 * checked against source**, in both directions.
 *
 * Four rungs live here rather than in the contract, because all four are about
 * the model as a whole:
 *
 *   - **The anchored family's membership is derived.** Every entry point with a
 *     root inheriting the shared positioning block must have a defaults file in
 *     the anchored family, and every member of that family must be in such an
 *     entry point. So the thirteenth anchored root cannot ship a defaults file
 *     missing a placement seed — which is the state
 *     [#1726](https://github.com/tutkli/forty-cdk/issues/1726) found ten roots
 *     in, with `provideForSelectDefaults({ align: 'end' })` type-checking,
 *     resolving, and doing nothing.
 *   - **The input-keyed families' membership is derived too.** An entry point
 *     that ships a defaults provider and declares a `loop` or
 *     `selectionFollowsFocus` input must have its defaults file in that key's
 *     family, and the input must be seeded from it. So a collection that
 *     hardcodes the key fails here instead of being skipped by a scope-wide
 *     keyboard policy, which is how nine of the fifteen wrap-capable entry points and
 *     Select's `selectionFollowsFocus` shipped until
 *     [#2262](https://github.com/tutkli/forty-cdk/issues/2262).
 *   - **The families partition nothing and may overlap.** Tooltip and HoverCard
 *     are in two families each (their placement seeds and their hover delays),
 *     which is why the closure case takes the union of every declared key rather
 *     than one family's own.
 *   - **A key the fallback populates is declared required.** The token always
 *     holds the resolved shape, so an optional key there types a value that is
 *     never `undefined` as `T | undefined`, and every reader grows its own copy
 *     of the fallback behind a `??` — the state
 *     [#2382](https://github.com/tutkli/forty-cdk/issues/2382) found Dialog and
 *     Drawer in. Only the keys named in `NO_DEFAULT_KEYS` stay optional.
 */
const DEFAULTS_INTERFACE = /export interface For[A-Za-z]+Defaults[^{]*\{([\s\S]*?)\n\}/;

/**
 * Defaults file → the keys its `For<Primitive>Defaults` interface declares.
 *
 * The interface body is the *exposed* surface — what
 * `provideFor<Primitive>Defaults` accepts — which is why the scan reads it
 * rather than `Object.keys` over the exported fallback: Dialog's `animateEnter`
 * / `animateLeave` / `backdropAnimateLeave` and their Drawer twins are absent
 * from both fallbacks (unset is a real state there), so a runtime comparison
 * would not see that pair of primitives share them at all.
 *
 * Only top-level members count — the pattern anchors on two-space indentation —
 * so a nested object type contributes its own name and not its fields, and the
 * optional marker is dropped because `modal?` and `modal` are the same key to a
 * consumer.
 */
function declaredKeysByFile(): Map<string, readonly string[]> {
  const keys = new Map<string, readonly string[]>();
  for (const [path, source] of LIBRARY_SOURCES) {
    if (!path.endsWith('-defaults.ts')) {
      continue;
    }
    const body = source.match(DEFAULTS_INTERFACE)?.[1];
    if (body === undefined) {
      continue;
    }
    keys.set(
      path,
      [...body.matchAll(/^ {2}([a-zA-Z][A-Za-z0-9]*)\??:/gm)].map((match) => match[1]!),
    );
  }
  return keys;
}

const DECLARED_KEYS = declaredKeysByFile();

const FALLBACK_OBJECT = /export const FOR_[A-Z_]+_FALLBACK_DEFAULTS\b[^=]*=\s*\{([\s\S]*?)\n\};/;

/** Defaults file → the top-level keys its `FOR_<PRIMITIVE>_FALLBACK_DEFAULTS` literal sets. */
function populatedKeysByFile(): Map<string, readonly string[]> {
  const keys = new Map<string, readonly string[]>();
  for (const path of DECLARED_KEYS.keys()) {
    const body = LIBRARY_SOURCES.get(path)!.match(FALLBACK_OBJECT)?.[1];
    if (body !== undefined) {
      keys.set(
        path,
        [...body.matchAll(/^ {2}([a-zA-Z][A-Za-z0-9]*)\s*[:,]/gm)].map((match) => match[1]!),
      );
    }
  }
  return keys;
}

/** Defaults file → the keys its `For<Primitive>Defaults` interface declares optional. */
function optionalKeysByFile(): Map<string, readonly string[]> {
  const keys = new Map<string, readonly string[]>();
  for (const path of DECLARED_KEYS.keys()) {
    const body = LIBRARY_SOURCES.get(path)!.match(DEFAULTS_INTERFACE)![1]!;
    keys.set(
      path,
      [...body.matchAll(/^ {2}([a-zA-Z][A-Za-z0-9]*)\?:/gm)].map((match) => match[1]!),
    );
  }
  return keys;
}

const POPULATED_KEYS = populatedKeysByFile();
const OPTIONAL_KEYS = optionalKeysByFile();

/**
 * The keys with genuinely no library default: absent from the fallback, so
 * "unset" is a real state and the interface keeps them optional.
 */
const NO_DEFAULT_KEYS: ReadonlyMap<string, readonly string[]> = new Map([
  ['defaults/src/dialog-defaults.ts', ['animateEnter', 'animateLeave', 'backdropAnimateLeave']],
  ['defaults/src/drawer-defaults.ts', ['animateEnter', 'animateLeave', 'backdropAnimateLeave']],
]);

const ANCHORED_SEEDS = ['side', 'align', 'sideOffset', 'collisionPadding'] as const;

const FAMILIES: readonly DefaultsKeyFamily[] = [
  {
    name: 'anchored positioning seeds',
    keys: ANCHORED_SEEDS,
    members: [
      'defaults/src/combobox-defaults.ts',
      'defaults/src/context-menu-defaults.ts',
      'defaults/src/date-picker-defaults.ts',
      'defaults/src/date-range-picker-defaults.ts',
      'defaults/src/dropdown-menu-defaults.ts',
      'defaults/src/hover-card-defaults.ts',
      'defaults/src/menu-defaults.ts',
      'defaults/src/menubar-defaults.ts',
      'defaults/src/popover-defaults.ts',
      'defaults/src/select-defaults.ts',
      'defaults/src/time-picker-defaults.ts',
      'defaults/src/tooltip-defaults.ts',
    ],
  },
  {
    name: 'menu viewport degradation',
    keys: ['fallbackAxisSideDirection'],
    members: [
      'defaults/src/context-menu-defaults.ts',
      'defaults/src/dropdown-menu-defaults.ts',
      'defaults/src/menu-defaults.ts',
      'defaults/src/menubar-defaults.ts',
    ],
  },
  {
    name: 'arrow-capable anchored overlays',
    keys: ['arrowPadding'],
    members: [
      'defaults/src/hover-card-defaults.ts',
      'defaults/src/popover-defaults.ts',
      'defaults/src/tooltip-defaults.ts',
    ],
  },
  {
    name: 'hover-scheduled overlays',
    keys: ['openDelay', 'closeDelay', 'skipDelayDuration'],
    members: [
      'defaults/src/hover-card-defaults.ts',
      'defaults/src/navigation-menu-defaults.ts',
      'defaults/src/tooltip-defaults.ts',
    ],
  },
  {
    name: 'free-floating modal surfaces',
    keys: [
      'modal',
      'dismissible',
      'initialFocus',
      'returnFocus',
      'animateEnter',
      'animateLeave',
      'backdropAnimateLeave',
    ],
    members: ['defaults/src/dialog-defaults.ts', 'defaults/src/drawer-defaults.ts'],
  },
  {
    name: 'datetime segment fields',
    keys: ['emptySegmentText', 'segmentLabels', 'placeholder'],
    members: [
      'defaults/src/date-field-defaults.ts',
      'defaults/src/date-range-field-defaults.ts',
      'defaults/src/time-field-defaults.ts',
      'defaults/src/time-range-field-defaults.ts',
    ],
  },
  {
    name: 'hour-cycle-capable date and time roots',
    keys: ['hourCycle'],
    members: [
      'defaults/src/date-field-defaults.ts',
      'defaults/src/date-range-field-defaults.ts',
      'defaults/src/date-picker-defaults.ts',
      'defaults/src/time-field-defaults.ts',
      'defaults/src/time-range-field-defaults.ts',
      'defaults/src/time-picker-defaults.ts',
    ],
  },
  {
    name: 'range field endpoint labels',
    keys: ['startLabel', 'endLabel'],
    members: [
      'defaults/src/date-range-field-defaults.ts',
      'defaults/src/time-range-field-defaults.ts',
    ],
  },
  {
    name: 'arrow-key collections with a wrap policy',
    keys: ['loop'],
    members: [
      'defaults/src/carousel-defaults.ts',
      'defaults/src/combobox-defaults.ts',
      'defaults/src/context-menu-defaults.ts',
      'defaults/src/dropdown-menu-defaults.ts',
      'defaults/src/listbox-defaults.ts',
      'defaults/src/menu-defaults.ts',
      'defaults/src/menubar-defaults.ts',
      'defaults/src/navigation-menu-defaults.ts',
      'defaults/src/radio-group-defaults.ts',
      'defaults/src/select-defaults.ts',
      'defaults/src/stepper-defaults.ts',
      'defaults/src/tabs-defaults.ts',
      'defaults/src/time-picker-defaults.ts',
      'defaults/src/toggle-defaults.ts',
      'defaults/src/toolbar-defaults.ts',
    ],
  },
  {
    name: 'tablist-backboned collections',
    keys: ['activationMode'],
    members: ['defaults/src/stepper-defaults.ts', 'defaults/src/tabs-defaults.ts'],
  },
  {
    name: 'step-grid page keys',
    keys: ['stepMultiplier'],
    members: ['defaults/src/number-input-defaults.ts', 'defaults/src/slider-defaults.ts'],
  },
  {
    name: 'selection-follows-focus collections',
    keys: ['selectionFollowsFocus'],
    members: [
      'defaults/src/listbox-defaults.ts',
      'defaults/src/select-defaults.ts',
      'defaults/src/tree-defaults.ts',
    ],
  },
];

const MODEL_KEYS = new Set(FAMILIES.flatMap((family) => family.keys));

const INHERITS_THE_BLOCK =
  /extends\s+(?:AnchoredOverlayPositioningBase|AnchoredFormValueControlBase|MenuOverlayHost|DatePickerBase)\b/;

/** Entry points declaring a root that inherits the shared positioning block. */
function anchoredEntryPoints(): Set<string> {
  const entries = new Set<string>();
  for (const [path, source] of LIBRARY_SOURCES) {
    if (entryPointOf(path) !== 'core-overlay' && INHERITS_THE_BLOCK.test(source)) {
      entries.add(entryPointOf(path));
    }
  }
  return entries;
}

/**
 * The entry point whose barrel re-exports each defaults file's provider. Every
 * defaults file lives in `forty-cdk/defaults`, so its own path names no
 * primitive; the re-export is what ties it back to the root that reads it.
 */
function owningEntryPoints(): Map<string, string> {
  const ownerOfProvider = new Map<string, string>();
  for (const [path, source] of LIBRARY_SOURCES) {
    if (path.endsWith('/src/public-api.ts') && entryPointOf(path) !== 'defaults') {
      for (const match of source.matchAll(/\b(provideFor[A-Za-z]+Defaults)\b/g)) {
        ownerOfProvider.set(match[1]!, entryPointOf(path));
      }
    }
  }
  const owners = new Map<string, string>();
  for (const path of DECLARED_KEYS.keys()) {
    const provider = LIBRARY_SOURCES.get(path)!.match(
      /^export function (provideFor[A-Za-z]+Defaults)/m,
    )?.[1];
    const owner = provider === undefined ? undefined : ownerOfProvider.get(provider);
    if (owner !== undefined) {
      owners.set(path, owner);
    }
  }
  return owners;
}

const OWNING_ENTRY_POINTS = owningEntryPoints();
const owningEntryPointOf = (path: string): string => OWNING_ENTRY_POINTS.get(path) ?? path;

const anchoredFamily = FAMILIES.find((family) => family.name === 'anchored positioning seeds')!;
const sorted = (values: Iterable<string>): string[] => [...values].sort();

const ENTRY_POINTS_WITH_DEFAULTS = new Set(OWNING_ENTRY_POINTS.values());

/**
 * Family keys a root exposes as an input of the same name. An entry point that
 * ships a defaults provider and declares one of these inputs is a member of the
 * key's family, so a scope-wide policy reaches every collection that can honour
 * it.
 */
const INPUT_KEYS = ['loop', 'selectionFollowsFocus'] as const;

/** Source file → the initializer of its `readonly <key> = input(…)`, in entry points with defaults. */
function inputSeeds(key: string): Map<string, string> {
  const declaration = new RegExp(`readonly ${key} = input(?:<[^>]*>)?\\(\\s*([^,)]*)`);
  const seeds = new Map<string, string>();
  for (const [path, code] of LIBRARY_CODE) {
    const seed = code.match(declaration)?.[1];
    if (seed !== undefined && ENTRY_POINTS_WITH_DEFAULTS.has(entryPointOf(path))) {
      seeds.set(path, seed.trim());
    }
  }
  return seeds;
}

describe('defaults-key parity families (meta-guard)', () => {
  it('finds a defaults interface in every defaults file the library ships', () => {
    const shipped = [...LIBRARY_SOURCES.keys()].filter((path) => path.endsWith('-defaults.ts'));

    expect(shipped.length).toBeGreaterThan(30);
    expect(sorted(DECLARED_KEYS.keys())).toEqual(sorted(shipped));
  });

  it('ties every defaults file to the entry point re-exporting its provider', () => {
    const orphans = [...DECLARED_KEYS.keys()].filter((path) => !OWNING_ENTRY_POINTS.has(path));

    expect(sorted(orphans)).toEqual([]);
  });

  it('finds a populated fallback literal in every defaults file', () => {
    const missing = [...DECLARED_KEYS.keys()].filter(
      (path) => (POPULATED_KEYS.get(path) ?? []).length === 0,
    );

    expect(sorted(missing)).toEqual([]);
  });

  it('declares every key its fallback populates as required', () => {
    const optionalButPopulated = [...OPTIONAL_KEYS].flatMap(([path, optional]) => {
      const populated = new Set(POPULATED_KEYS.get(path) ?? []);
      return optional.filter((key) => populated.has(key)).map((key) => `${path}: \`${key}\``);
    });

    expect(sorted(optionalButPopulated)).toEqual([]);
  });

  it('keeps optional only the keys named as having no library default', () => {
    const toEntries = (keys: ReadonlyMap<string, readonly string[]>) =>
      sorted([...keys].flatMap(([path, names]) => names.map((key) => `${path}: \`${key}\``)));

    expect(toEntries(OPTIONAL_KEYS)).toEqual(toEntries(NO_DEFAULT_KEYS));
  });

  it('names only defaults files the library still ships', () => {
    const claimed = new Set(FAMILIES.flatMap((family) => family.members));
    const unknown = [...claimed].filter((member) => !DECLARED_KEYS.has(member));

    expect(sorted(unknown)).toEqual([]);
  });

  it('puts a defaults file from every anchored entry point in the anchored family', () => {
    const covered = new Set(anchoredFamily.members.map(owningEntryPointOf));
    const missing = [...anchoredEntryPoints()].filter((entry) => !covered.has(entry));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no anchored member from an entry point with no anchored root', () => {
    const anchored = anchoredEntryPoints();
    const stale = anchoredFamily.members
      .map(owningEntryPointOf)
      .filter((entry) => !anchored.has(entry));

    expect(sorted(new Set(stale))).toEqual([]);
  });

  for (const key of INPUT_KEYS) {
    const family = FAMILIES.find((f) => f.keys.length === 1 && f.keys[0] === key)!;
    const seeds = inputSeeds(key);

    it(`finds a \`${key}\` input in at least two entry points with defaults`, () => {
      expect(new Set([...seeds.keys()].map(entryPointOf)).size).toBeGreaterThanOrEqual(2);
    });

    it(`puts the defaults file of every entry point declaring a \`${key}\` input in its family`, () => {
      const covered = new Set(family.members.map(owningEntryPointOf));
      const missing = [...seeds.keys()].map(entryPointOf).filter((entry) => !covered.has(entry));

      expect(sorted(new Set(missing))).toEqual([]);
    });

    it(`claims no \`${key}\` member from an entry point declaring no \`${key}\` input`, () => {
      const declaring = new Set([...seeds.keys()].map(entryPointOf));
      const stale = family.members.map(owningEntryPointOf).filter((entry) => !declaring.has(entry));

      expect(sorted(stale)).toEqual([]);
    });

    it(`seeds every \`${key}\` input from its scope defaults`, () => {
      const hardcoded = [...seeds]
        .filter(([, seed]) => seed !== `this.#defaults.${key}`)
        .map(([path, seed]) => `${path}: seeded from \`${seed}\``);

      expect(sorted(hardcoded)).toEqual([]);
    });
  }
});

for (const family of FAMILIES) {
  assertDefaultsKeyParity(family, { declaredKeys: DECLARED_KEYS, modelKeys: MODEL_KEYS });
}
