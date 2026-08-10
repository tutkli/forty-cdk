/**
 * Meta-guard for the overlay-controller fold
 * ([#1764](https://github.com/tutkli/forty-cdk/issues/1764)): the open / close /
 * dismiss machine every trigger-anchored overlay surface runs is declared
 * **once**, in `core-overlay/overlay-controller/overlay-controller.ts`, and the
 * two callers that used to own a copy of it — `MenuOverlay` behind the four menu
 * roots, `ListboxOverlayController` behind `[forSelect]` / `[forTimePicker]` —
 * compose it instead.
 *
 * **The derived property is "this module composes both `InitialFocusState` and
 * `CloseReasonState`"**, which is what a surface owning the machine looks like:
 * the initial-focus target a trigger arms before flipping open, plus the close
 * reason the content reads to decide its return-focus. It is not exact — two
 * modules outside this issue's scope match it and are declared below with the
 * condition that keeps each of them honest — but it is exact in the direction
 * that matters: re-inlining the machine into either facade turns this red.
 *
 * The behavioural proof lives elsewhere and is unchanged by the fold:
 * `menu-overlay.spec.ts` and `listbox-overlay-controller.spec.ts` still drive
 * the two facades' full surfaces, and `overlay-controller.spec.ts` drives the
 * shared machine's own semantics.
 */
const SOURCES = import.meta.glob('../../*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** `<entry-point>/src/<path>.ts`, the id the assertions below name modules by. */
function moduleId(path: string): string {
  return path.replace(/^\.\.\/\.\.\//, '').replace(/\.ts$/, '');
}

function librarySources(): [string, string][] {
  return Object.entries(SOURCES)
    .filter(([path]) => !path.endsWith('.spec.ts'))
    .map(([path, source]) => [moduleId(path), source] as [string, string]);
}

/** Strips block and line comments so prose about a symbol never counts as a use of it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const SHARED_MACHINE = 'core-overlay/src/overlay-controller/overlay-controller';
const MENU_FACADE = 'core-overlay/src/menu-overlay/menu-overlay';
const LISTBOX_FACADE = 'core-overlay/src/listbox-overlay/listbox-overlay-controller';
const ENABLED_SCAN = 'core/src/collection/enabled-handle-navigation';

/**
 * Modules that own an overlay open / close machine without composing the shared
 * controller. Each states the condition that keeps it out of scope, and the
 * condition is checked rather than trusted — a module whose reason stops holding
 * fails here instead of quietly becoming a third copy nobody folded.
 */
const DECLARED_EXCLUSIONS: {
  readonly id: string;
  readonly why: string;
  readonly stillHolds: (source: string) => boolean;
}[] = [
  {
    id: 'combobox/src/combobox',
    why: 'the editable anatomy never moves DOM focus into its surface, so it composes no overlay controller at all (row 6 of the overlay decision table)',
    stillHolds: (source) =>
      !source.includes('ListboxOverlayController') && !source.includes('MenuOverlay'),
  },
  {
    id: 'menubar/src/menubar-menu-context',
    why: 'it multiplexes one menu context across the bar triggers instead of owning a MenuOverlay',
    stillHolds: (source) =>
      !source.includes('createMenuOverlay') && source.includes('MenuItemList'),
  },
];

describe('overlay controller fold', () => {
  it('declares the open / close machine in exactly one module plus the declared exclusions', () => {
    const owners = librarySources()
      .filter(([, source]) => {
        const code = stripComments(source);
        return code.includes('new InitialFocusState') && code.includes('new CloseReasonState');
      })
      .map(([id]) => id)
      .sort();

    expect(owners).toEqual(
      [SHARED_MACHINE, ...DECLARED_EXCLUSIONS.map((exclusion) => exclusion.id)].sort(),
    );
  });

  it('keeps every declared exclusion honest', () => {
    const sources = new Map(librarySources());
    const stale = DECLARED_EXCLUSIONS.filter((exclusion) => {
      const source = sources.get(exclusion.id);
      return source === undefined || !exclusion.stillHolds(stripComments(source));
    }).map((exclusion) => `${exclusion.id}: ${exclusion.why}`);

    expect(stale).toEqual([]);
  });

  it('leaves both folded facades composing the shared controller', () => {
    const sources = new Map(librarySources());
    for (const facade of [MENU_FACADE, LISTBOX_FACADE]) {
      const code = stripComments(sources.get(facade) ?? '');
      expect(code).toContain('new OverlayController');
      expect(code).not.toContain('new InitialFocusState');
      expect(code).not.toContain('new CloseReasonState');
    }
  });

  it('leaves the dismiss / auto-focus veto plumbing out of both facades', () => {
    const sources = new Map(librarySources());
    for (const facade of [MENU_FACADE, LISTBOX_FACADE]) {
      const code = stripComments(sources.get(facade) ?? '');
      expect(code).not.toContain('emitVetoableEvent(');
      expect(code).not.toContain('emitVetoableNativeEvent(');
    }
  });

  it('declares the reverse enabled-handle scan once', () => {
    const descendingScan = /for\s*\(\s*let\s+\w+\s*=[^;]*\.length\s*-\s*1\s*;[^)]*\)/g;
    const offenders = librarySources().flatMap(([id, source]) => {
      if (id === ENABLED_SCAN) {
        return [];
      }
      const code = stripComments(source);
      return [...code.matchAll(descendingScan)]
        .filter((match) => code.slice(match.index, match.index + 300).includes('.disabled()'))
        .map(() => id);
    });

    expect(offenders).toEqual([]);
  });
});
