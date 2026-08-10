/**
 * Meta-guard for the overlay-controller fold
 * ([#1764](https://github.com/tutkli/forty-cdk/issues/1764),
 * [#1768](https://github.com/tutkli/forty-cdk/issues/1768)): the open / close /
 * dismiss machine every trigger-anchored overlay surface runs is declared
 * **once**, in `core-overlay/overlay-controller/overlay-controller.ts`, and every
 * module that used to own a copy of it composes that one instead — `MenuOverlay`
 * behind the four menu roots, `ListboxOverlayController` behind `[forSelect]` /
 * `[forTimePicker]`, `[forCombobox]`'s root, and `[forMenubar]`'s multiplexed
 * `MenubarMenuContext`.
 *
 * **The derived property is "this module composes both `InitialFocusState` and
 * `CloseReasonState`"**, which is what a surface owning the machine looks like:
 * the initial-focus target a trigger arms before flipping open, plus the close
 * reason the content reads to decide its return-focus. #1764 left the last two
 * matches as declared exclusions with a checked condition; #1768 folded both, so
 * the property is now exact in both directions and the exclusion list is gone —
 * re-inlining the machine anywhere turns this red.
 *
 * The behavioural proof lives elsewhere and is unchanged by the fold:
 * `menu-overlay.spec.ts`, `listbox-overlay-controller.spec.ts`,
 * `combobox.spec.ts` and `menubar.spec.ts` still drive the four composers' full
 * surfaces, and `overlay-controller.spec.ts` drives the shared machine's own
 * semantics.
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
const ENABLED_SCAN = 'core/src/collection/enabled-handle-navigation';

/**
 * Every module that composes the shared machine. Each ran its own copy of the
 * open / close / dismiss pipeline before the fold, so each is checked for the
 * state and the veto plumbing having actually left rather than been moved.
 */
const COMPOSERS = [
  'core-overlay/src/menu-overlay/menu-overlay',
  'core-overlay/src/listbox-overlay/listbox-overlay-controller',
  'combobox/src/combobox',
  'menubar/src/menubar-menu-context',
];

describe('overlay controller fold', () => {
  it('declares the open / close machine in exactly one module', () => {
    const owners = librarySources()
      .filter(([, source]) => {
        const code = stripComments(source);
        return code.includes('new InitialFocusState') && code.includes('new CloseReasonState');
      })
      .map(([id]) => id)
      .sort();

    expect(owners).toEqual([SHARED_MACHINE]);
  });

  it('leaves every composer holding neither half of the machine state', () => {
    const sources = new Map(librarySources());
    for (const composer of COMPOSERS) {
      const code = stripComments(sources.get(composer) ?? '');
      expect(code).toContain('new OverlayController');
      expect(code).not.toContain('new InitialFocusState');
      expect(code).not.toContain('new CloseReasonState');
    }
  });

  it('leaves the dismiss / auto-focus veto plumbing out of every composer', () => {
    const sources = new Map(librarySources());
    for (const composer of COMPOSERS) {
      const code = stripComments(sources.get(composer) ?? '');
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
