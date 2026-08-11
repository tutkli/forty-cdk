import { assertDefaultsKeyParity, type DefaultsKeyFamily } from '../test-utils/contract';

/**
 * Meta-guard for defaults-key parity: the families whose members expose one
 * shared vocabulary on their `For<Primitive>Defaults` interface, and the
 * declaration of who is in each.
 *
 * `core/defaults/per-primitive-defaults.spec.ts` covers each provider on its
 * own — the fallback resolves, an override merges per key — and derives the
 * provider set from source so a fortieth cannot go uncovered. What it cannot see
 * is a family drifting: a tunable added to one member and not its siblings, or
 * added under a second spelling. This guard is the cross-primitive half, and the
 * shape is the one `.claude/rules/testing.md` prescribes — the grouping is
 * declared because no scan can infer it, and **everything about the members is
 * checked against source**, in both directions.
 *
 * Two rungs live here rather than in the contract, because both are about the
 * model as a whole:
 *
 *   - **The anchored family's membership is derived.** Every entry point with a
 *     root inheriting the shared positioning block must have a defaults file in
 *     the anchored family, and every member of that family must be in such an
 *     entry point. So the thirteenth anchored root cannot ship a defaults file
 *     missing a placement seed — which is the state
 *     [#1726](https://github.com/tutkli/forty-cdk/issues/1726) found ten roots
 *     in, with `provideForSelectDefaults({ align: 'end' })` type-checking,
 *     resolving, and doing nothing.
 *   - **The families partition nothing and may overlap.** Tooltip and HoverCard
 *     are in two families each (their placement seeds and their hover delays),
 *     which is why the closure case takes the union of every declared key rather
 *     than one family's own.
 */
const SOURCES = import.meta.glob('../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const pathOf = (key: string): string => key.replace(/^(?:\.\.\/)+/, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), source as string] as const);

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

const ANCHORED_SEEDS = ['side', 'align', 'sideOffset', 'collisionPadding'] as const;

const FAMILIES: readonly DefaultsKeyFamily[] = [
  {
    name: 'anchored positioning seeds',
    keys: ANCHORED_SEEDS,
    members: [
      'combobox/src/combobox-defaults.ts',
      'context-menu/src/context-menu-defaults.ts',
      'date-picker/src/date-picker-defaults.ts',
      'date-picker/src/date-range-picker-defaults.ts',
      'dropdown-menu/src/dropdown-menu-defaults.ts',
      'hover-card/src/hover-card-defaults.ts',
      'menu/src/menu-defaults.ts',
      'menubar/src/menubar-defaults.ts',
      'popover/src/popover-defaults.ts',
      'select/src/select-defaults.ts',
      'time-picker/src/time-picker-defaults.ts',
      'tooltip/src/tooltip-defaults.ts',
    ],
  },
  {
    name: 'menu viewport degradation',
    keys: ['fallbackAxisSideDirection'],
    members: [
      'context-menu/src/context-menu-defaults.ts',
      'dropdown-menu/src/dropdown-menu-defaults.ts',
      'menu/src/menu-defaults.ts',
      'menubar/src/menubar-defaults.ts',
    ],
  },
  {
    name: 'arrow-capable anchored overlays',
    keys: ['arrowPadding'],
    members: [
      'hover-card/src/hover-card-defaults.ts',
      'popover/src/popover-defaults.ts',
      'tooltip/src/tooltip-defaults.ts',
    ],
  },
  {
    name: 'hover-scheduled overlays',
    keys: ['openDelay', 'closeDelay', 'skipDelayDuration'],
    members: ['hover-card/src/hover-card-defaults.ts', 'tooltip/src/tooltip-defaults.ts'],
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
    members: ['dialog/src/dialog-defaults.ts', 'drawer/src/drawer-defaults.ts'],
  },
  {
    name: 'datetime segment fields',
    keys: ['emptySegmentText', 'segmentLabels'],
    members: [
      'date-field/src/date-field-defaults.ts',
      'date-field/src/date-range-field-defaults.ts',
      'time-field/src/time-field-defaults.ts',
      'time-field/src/time-range-field-defaults.ts',
    ],
  },
  {
    name: 'range field endpoint labels',
    keys: ['startLabel', 'endLabel'],
    members: [
      'date-field/src/date-range-field-defaults.ts',
      'time-field/src/time-range-field-defaults.ts',
    ],
  },
  {
    name: 'roving collections with a wrap policy',
    keys: ['loop'],
    members: [
      'carousel/src/carousel-defaults.ts',
      'radio-group/src/radio-group-defaults.ts',
      'stepper/src/stepper-defaults.ts',
      'tabs/src/tabs-defaults.ts',
      'toggle/src/toggle-defaults.ts',
      'toolbar/src/toolbar-defaults.ts',
    ],
  },
  {
    name: 'tablist-backboned collections',
    keys: ['activationMode'],
    members: ['stepper/src/stepper-defaults.ts', 'tabs/src/tabs-defaults.ts'],
  },
  {
    name: 'step-grid page keys',
    keys: ['stepMultiplier'],
    members: ['number-input/src/number-input-defaults.ts', 'slider/src/slider-defaults.ts'],
  },
  {
    name: 'selection-follows-focus collections',
    keys: ['selectionFollowsFocus'],
    members: ['listbox/src/listbox-defaults.ts', 'tree/src/tree-defaults.ts'],
  },
];

/**
 * Primitives the *concept* of a family covers that are not members, with the
 * reason and the condition the guard falsifies.
 *
 * `[forNavigationMenu]` is the third hover-scheduled overlay: it schedules the
 * same open / close / skip delays through the same hover-intent machinery, and
 * spells the open one `delayDuration` where Tooltip and HoverCard spell it
 * `openDelay`. That is precisely the drift this contract exists to catch, one
 * release too late to catch for free — renaming a published defaults key is a
 * consumer break, so it is tracked rather than taken here, and the exclusion is
 * conditional on the drift still existing: the day NavigationMenu declares
 * `openDelay`, this fails and it joins the family, where the missing-key case
 * would otherwise be the one to report it.
 */
const EXCLUSIONS: Readonly<Record<string, { family: string; key: string; why: string }>> = {
  'navigation-menu/src/navigation-menu-defaults.ts': {
    family: 'hover-scheduled overlays',
    key: 'openDelay',
    why: 'spells its open delay `delayDuration`, so joining the family is a key rename and a consumer break',
  },
};

const MODEL_KEYS = new Set(FAMILIES.flatMap((family) => family.keys));

const INHERITS_THE_BLOCK =
  /extends\s+(?:AnchoredOverlayPositioningBase|AnchoredFormValueControlBase|MenuOverlayHost|DatePickerBase)\b/;

const entryPointOf = (path: string): string => path.split('/')[0]!;

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

const anchoredFamily = FAMILIES.find((family) => family.name === 'anchored positioning seeds')!;
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('defaults-key parity families (meta-guard)', () => {
  it('finds a defaults interface in every defaults file the library ships', () => {
    const shipped = LIBRARY_SOURCES.filter(([path]) => path.endsWith('-defaults.ts')).map(
      ([path]) => path,
    );

    expect(shipped.length).toBeGreaterThan(30);
    expect(sorted(DECLARED_KEYS.keys())).toEqual(sorted(shipped));
  });

  it('names only defaults files the library still ships', () => {
    const claimed = new Set(FAMILIES.flatMap((family) => family.members));
    const unknown = [...claimed].filter((member) => !DECLARED_KEYS.has(member));

    expect(sorted(unknown)).toEqual([]);
  });

  it('puts a defaults file from every anchored entry point in the anchored family', () => {
    const covered = new Set(anchoredFamily.members.map(entryPointOf));
    const missing = [...anchoredEntryPoints()].filter((entry) => !covered.has(entry));

    expect(sorted(missing)).toEqual([]);
  });

  it('claims no anchored member from an entry point with no anchored root', () => {
    const anchored = anchoredEntryPoints();
    const stale = anchoredFamily.members.map(entryPointOf).filter((entry) => !anchored.has(entry));

    expect(sorted(new Set(stale))).toEqual([]);
  });

  it('excludes no primitive whose exclusion condition stopped holding', () => {
    const stale = Object.entries(EXCLUSIONS).flatMap(([path, exclusion]) => {
      const keys = DECLARED_KEYS.get(path);
      if (keys === undefined) {
        return [`${path}: no longer declares a defaults interface`];
      }
      if (!FAMILIES.some((family) => family.name === exclusion.family)) {
        return [`${path}: names no declared family (${exclusion.family})`];
      }
      return keys.includes(exclusion.key) ? [`${path}: now declares \`${exclusion.key}\``] : [];
    });

    expect(sorted(stale)).toEqual([]);
  });
});

for (const family of FAMILIES) {
  assertDefaultsKeyParity(family, { declaredKeys: DECLARED_KEYS, modelKeys: MODEL_KEYS });
}
