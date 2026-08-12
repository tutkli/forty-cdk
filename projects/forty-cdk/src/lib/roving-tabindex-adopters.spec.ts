/**
 * Meta-guard: every group that owns a roving-tabindex keyboard model is covered
 * by an adopter of the shared roving-tabindex contract, and every claim names a
 * tracker that still exists.
 *
 * Derived from source rather than declared, for the reason its five siblings
 * were written: a missing adopter is *invisible* otherwise. The suite reports N
 * green primitives whether the roster lists N or N + 1 — and this was the last
 * roster in the library read out of a file header by hand
 * ([#1658](https://github.com/tutkli/forty-cdk/issues/1658)).
 *
 * **The family is "this root constructs a `RovingTabindex`."** Picking that
 * property is the whole of the design here, because the obvious alternative is
 * wrong by an order of magnitude: `'[attr.tabindex]'` appears in thirty-six
 * library files today and the overwhelming majority (`switch`, `checkbox`,
 * `slider-thumb`, `pane-resizer`, `button`, …) are not roving groups at all —
 * one tab stop shared between siblings is not something a `tabindex` binding can
 * express. The tracker *is* that shared tab stop, so constructing one is the
 * property, and `core/roving-tabindex` is its single definition.
 *
 * Three things about the pairing:
 *
 *   - **A claim pairs `(root, spec)` with the `<file>::<member>` trackers its
 *     mount drives**, and the per-spec call count is what keeps it finer than an
 *     entry point — the lesson [#1645](https://github.com/tutkli/forty-cdk/issues/1645)
 *     paid for. Two trackers in one file is not hypothetical:
 *     `core/datetime/range-field-composer` builds one per endpoint, so keying on
 *     the file alone would let either cover for the other.
 *   - **`[forRadioGroup]` is a *declared* member, not a derived one**, and it is
 *     the reason this roster could not simply be scanned into existence. It owns
 *     a roving-tabindex model and adopts the contract in full, yet constructs no
 *     tracker: selection follows focus in the WAI-ARIA Radio Group pattern, so
 *     the group's Tab entry point is its checked radio and there is no
 *     user-driven roving pointer that could diverge from it. A tracker
 *     constructed there would be either redundant (the arrow path already moves
 *     the selection) or wrong (under `readonly`, arrows move focus without
 *     selecting, and the checked radio must stay the entry point). What the
 *     asymmetry cost — a second implementation of the ladder — is paid off
 *     instead by `selectionTabStop`, the shared rungs `rovingTabStop` delegates
 *     to, and the declared-member case below checks that `[forRadio]` still
 *     resolves through it.
 *   - **Comments are stripped before the scan.** `core/roving-tabindex`
 *     documents `new RovingTabindex()` as the way to build one, in a JSDoc line
 *     a bare scan reads as a fifteenth construction. Same anchoring failure the
 *     marker rules hit in [#1606](https://github.com/tutkli/forty-cdk/issues/1606)
 *     / #1609: prose about a symbol is not a use of it.
 *
 * **Menu is outside the family by construction, with no exclusion to maintain.**
 * `[forMenuItem]` carries a *static* `tabindex="-1"` and the shared menu overlay
 * moves focus imperatively, so no menu file constructs a tracker and the scan
 * never puts it on the flank — the ContextMenu shape from the `aria-haspopup`
 * roster, and strictly better than the exclusion string the contract's header
 * used to carry, which is the form that goes stale while still reading
 * plausibly. Drag-drop's header exclusion was exactly that: it described the
 * *lifted* state (Arrow moves the item, no Home / End), and an **idle**
 * `[forDraggable]` resolves `resolveListNavigation` into a plain focus move with
 * Home / End and disabled skipping. The contract never lifts, so drag-drop is an
 * adopter and its own spec had already hand-written five of the contract's cases.
 *
 * The first three cases are liveness probes over the extraction: a mis-typed
 * glob returns an empty record, a renamed class reports zero constructions, and
 * a construction written in a shape the extractor cannot key would vanish from
 * the roster instead of failing it.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * The keyboard model an excluded tracker owns instead of the contract's. Each
 * value is falsified by its own conditions in the last case — never by a note
 * that its subject still exists, which is the weaker half a stale exclusion
 * keeps passing on.
 */
type ExcludedKeyboardModel = 'grid' | 'segment-strip';

interface RovingTabindexAdopter {
  /**
   * The root the claim is stated over, as its selector. Checked against source,
   * so a renamed root cannot leave a claim pointing at nothing.
   */
  readonly root: string;
  /**
   * The spec making the claim. It must hold one `assertRovingTabindexContract`
   * call per claim naming it.
   */
  readonly spec: string;
  /**
   * The `<source file>::<member>` trackers this claim's mount drives. Empty for
   * a **declared** member, which owns the model and constructs none — see
   * `handWrittenLadder`.
   */
  readonly trackers: readonly string[];
  /**
   * For a declared member only: the source file resolving the tab stop without a
   * tracker. It must still route through the shared `selectionTabStop` ladder and
   * still read its root's tab-stop read-backs, and its entry point must still
   * construct no tracker — otherwise the claim belongs on the derived side.
   */
  readonly handWrittenLadder?: string;
}

const ADOPTERS: readonly RovingTabindexAdopter[] = [
  {
    root: '[forListbox]',
    spec: 'listbox/src/listbox.spec.ts',
    trackers: ['listbox/src/listbox.ts::roving'],
  },
  {
    root: '[forMenubar]',
    spec: 'menubar/src/menubar.spec.ts',
    trackers: ['menubar/src/menubar.ts::roving'],
  },
  {
    root: '[forStepper]',
    spec: 'stepper/src/stepper.spec.ts',
    trackers: ['stepper/src/stepper.ts::roving'],
  },
  {
    root: '[forTabs]',
    spec: 'tabs/src/tabs.spec.ts',
    trackers: ['tabs/src/tabs.ts::roving'],
  },
  {
    root: '[forToggleGroup]',
    spec: 'toggle/src/toggle-group.spec.ts',
    trackers: ['toggle/src/toggle-group.ts::roving'],
  },
  {
    root: '[forToolbar]',
    spec: 'toolbar/src/toolbar.spec.ts',
    trackers: ['toolbar/src/toolbar.ts::roving'],
  },
  {
    root: '[forCarousel]',
    spec: 'carousel/src/carousel.spec.ts',
    trackers: ['carousel/src/carousel.ts::roving'],
  },
  {
    root: '[forTree]',
    spec: 'tree/src/tree.spec.ts',
    trackers: ['tree/src/tree.ts::roving'],
  },
  {
    root: '[forDropList]',
    spec: 'drag-drop/src/drag-drop.spec.ts',
    trackers: ['drag-drop/src/drop-list.ts::roving'],
  },
  // The declared member: owns the model, constructs no tracker.
  {
    root: '[forRadioGroup]',
    spec: 'radio-group/src/radio-group.spec.ts',
    trackers: [],
    handWrittenLadder: 'radio-group/src/radio.ts',
  },
];

/**
 * Trackers whose group deliberately adopts nothing, with the keyboard model it
 * owns instead. Both models diverge from the contract on the same rung — its
 * `Home` / `End` cases assert a jump to the ends of *the collection*, which is
 * the assertion a second axis or a spinbutton value range makes false.
 */
const EXCLUSIONS: readonly {
  readonly tracker: string;
  readonly keyboardModel: ExcludedKeyboardModel;
  readonly reason: string;
}[] = [
  {
    tracker: 'table/src/table.ts::#roving',
    keyboardModel: 'grid',
    reason:
      "[forTable]'s tracker roves a 2D grid over the composite header + body cells, so its cell keydown resolves through `resolveGridNavigation`: plain Home / End address the current *row* (`first-in-row` / `last-in-row`) and only Ctrl+Home / Ctrl+End reach the ends of the collection, which is what the contract's two jump cases assert",
  },
  {
    tracker: 'date-field/src/date-field.ts::roving',
    keyboardModel: 'segment-strip',
    reason:
      "[forDateField]'s tracker roves a strip of `role=\"spinbutton\"` segments, whose APG keyboard map spends Home / End on the segment's own value bounds rather than on a focus move, and which carries neither a per-item disabled state nor a selection for the contract's remaining rungs",
  },
  {
    tracker: 'time-field/src/time-field.ts::roving',
    keyboardModel: 'segment-strip',
    reason: "[forTimeField]'s tracker is the same spinbutton segment strip as [forDateField]'s",
  },
  {
    tracker: 'core/src/datetime/range-field-composer.ts::startRoving',
    keyboardModel: 'segment-strip',
    reason:
      "`RangeFieldComposer` builds one tracker per endpoint of the four range fields, each roving the same spinbutton segment strip as the single fields'",
  },
  {
    tracker: 'core/src/datetime/range-field-composer.ts::endRoving',
    keyboardModel: 'segment-strip',
    reason: "the end endpoint's half of `RangeFieldComposer`'s pair",
  },
];

/** The shared ladder a declared member must still resolve its tab stop through. */
const SHARED_LADDER = 'selectionTabStop(';

/** The source declaring the grid resolver whose Home / End are row-scoped. */
const KEYBOARD_NAVIGATION = 'core/src/keyboard-navigation/keyboard-navigation.ts';

/** The source declaring the spinbutton segment whose Home / End are value bounds. */
const SEGMENT_DIRECTIVE = 'core/src/datetime/segment-directive.ts';

const pathOf = (key: string): string => key.replace(/^\/projects\/forty-cdk\//, '');

const entryPointOf = (path: string): string => path.split('/')[0]!;

/**
 * Source with comments removed, so prose naming a symbol is not read as a use of
 * it. Every scan below runs over this rather than the raw text.
 */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

const SPEC_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), source as string] as const);

const sourceOf = (path: string): string =>
  LIBRARY_SOURCES.find(([candidate]) => candidate === path)?.[1] ?? '';

interface TrackerSite {
  /** `<source file>::<member>`. */
  readonly id: string;
  /**
   * Whether the tracker was handed an items producer. Without one it is a
   * pass-through of the raw pointer, so the group has no per-item disabled state
   * and no selection to reconcile against — half of what the contract asserts.
   */
  readonly hasItemsProducer: boolean;
}

/**
 * Every construction of the roving tracker, keyed by the member it is assigned
 * to so two in one file stay distinguishable.
 */
function trackerSites(): TrackerSite[] {
  const sites: TrackerSite[] = [];
  for (const [path, source] of LIBRARY_SOURCES) {
    const pattern = /(?:readonly\s+)?(#?[A-Za-z_$][\w$]*)\s*=\s*new RovingTabindex\((\)?)/g;
    for (const match of source.matchAll(pattern)) {
      sites.push({ id: `${path}::${match[1]!}`, hasItemsProducer: match[2] !== ')' });
    }
  }
  return sites;
}

/** How many times library source constructs the tracker, in any shape. */
function totalConstructions(): number {
  return LIBRARY_SOURCES.reduce(
    (total, [, source]) => total + (source.match(/new RovingTabindex\(/g) ?? []).length,
    0,
  );
}

/** Spec path → how many times it calls the contract. */
function contractCalls(): Map<string, number> {
  const calls = new Map<string, number>();
  for (const [path, source] of SPEC_SOURCES) {
    const count = (source.match(/assertRovingTabindexContract\(/g) ?? []).length;
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

const claimedTrackers = new Set(ADOPTERS.flatMap((adopter) => adopter.trackers));
const excludedTrackers = new Set(EXCLUSIONS.map((exclusion) => exclusion.tracker));
const claimsPerSpec = new Map<string, number>();
for (const adopter of ADOPTERS) {
  claimsPerSpec.set(adopter.spec, (claimsPerSpec.get(adopter.spec) ?? 0) + 1);
}
const sorted = (values: Iterable<string>): string[] => [...values].sort();

describe('roving-tabindex contract adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every construction of the roving tracker', () => {
    expect(trackerSites().length).toBeGreaterThanOrEqual(14);
  });

  it('keys every construction it finds, so none can vanish from the roster', () => {
    expect(trackerSites().length).toBe(totalConstructions());
  });

  it('has an adopter or an exclusion for every tracker', () => {
    const uncovered = trackerSites()
      .map((site) => site.id)
      .filter((id) => !claimedTrackers.has(id) && !excludedTrackers.has(id));

    expect(sorted(uncovered)).toEqual([]);
  });

  it('claims no tracker that no longer exists', () => {
    const built = new Set(trackerSites().map((site) => site.id));
    const stale = [...claimedTrackers, ...excludedTrackers].filter((id) => !built.has(id));

    expect(sorted(stale)).toEqual([]);
  });

  it('names a root that still declares its selector', () => {
    const selectors = declaredSelectors();
    const unknown = ADOPTERS.filter((adopter) => !selectors.has(adopter.root)).map(
      (adopter) => adopter.root,
    );

    expect(sorted(new Set(unknown))).toEqual([]);
  });

  it('has one contract call per claim in the spec that makes it', () => {
    const calls = contractCalls();

    const short = [...claimsPerSpec.entries()]
      .filter(([spec, claims]) => (calls.get(spec) ?? 0) < claims)
      .map(([spec, claims]) => `${spec}: ${claims} claim(s), ${calls.get(spec) ?? 0} call(s)`);

    expect(sorted(short)).toEqual([]);
  });

  it('declares no hand-written member whose reason stopped holding', () => {
    const built = trackerSites();

    const stale = ADOPTERS.filter((adopter) => adopter.handWrittenLadder !== undefined).flatMap(
      (adopter) => {
        const ladder = adopter.handWrittenLadder!;
        const reasons: string[] = [];
        if (built.some((site) => entryPointOf(site.id) === entryPointOf(ladder))) {
          reasons.push('now constructs a tracker, so the claim belongs on the derived side');
        }
        if (!sourceOf(ladder).includes(SHARED_LADDER)) {
          reasons.push(`no longer resolves its tab stop through ${SHARED_LADDER}`);
        }
        const source = sourceOf(ladder);
        if (!source.includes('hasSelectedRadio()') || !source.includes('isFirstEnabledRadio(')) {
          reasons.push('no longer reads its root tab-stop read-backs');
        }
        return reasons.map((reason) => `${adopter.root}: ${reason}`);
      },
    );

    expect(sorted(stale)).toEqual([]);
  });

  it('excludes no tracker whose keyboard model stopped diverging', () => {
    const producers = new Map(trackerSites().map((site) => [site.id, site.hasItemsProducer]));

    const stale = EXCLUSIONS.flatMap((exclusion) => {
      const path = exclusion.tracker.split('::')[0]!;
      const source = sourceOf(path);
      const reasons: string[] = [];
      if (exclusion.keyboardModel === 'grid') {
        if (!source.includes('resolveGridNavigation(')) {
          reasons.push('no longer resolves its keydown through the two-axis grid resolver');
        }
        if (source.includes('resolveListNavigation(')) {
          reasons.push('now resolves 1D list navigation, which the contract does model');
        }
        if (!sourceOf(KEYBOARD_NAVIGATION).includes("? 'first' : 'first-in-row'")) {
          reasons.push('the grid resolver no longer scopes plain Home to the current row');
        }
      }
      if (exclusion.keyboardModel === 'segment-strip') {
        const segment = sourceOf(SEGMENT_DIRECTIVE);
        if (!segment.includes("role: 'spinbutton'")) {
          reasons.push('its items are no longer spinbuttons');
        }
        if (
          !segment.includes("goToBound(type, 'min')") ||
          !segment.includes("goToBound(type, 'max')")
        ) {
          reasons.push('Home / End no longer address the segment value bounds');
        }
        if (producers.get(exclusion.tracker) !== false) {
          reasons.push('now takes an items producer, so it has a collection to rove');
        }
      }
      return reasons.map((reason) => `${exclusion.tracker}: ${reason}`);
    });

    expect(sorted(stale)).toEqual([]);
  });
});
