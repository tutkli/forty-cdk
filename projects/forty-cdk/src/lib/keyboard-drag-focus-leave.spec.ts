/**
 * Meta-guard: "focus left the host" is resolved in exactly one place for every
 * `createKeyboardDragMediator` caller
 * ([#1673](https://github.com/tutkli/forty-cdk/issues/1673)).
 *
 * The mediator used to hand each caller the raw `focusout` and let it decide
 * where focus had gone, and four callers answered that three different ways: the
 * table deferred a `relatedTarget: null` leave one microtask and re-checked
 * `document.activeElement`, listbox and tree cancelled on it immediately (and
 * cast the `EventTarget` to `HTMLElement | null`, which lies on any non-element
 * target), and virtual-reorder never read `relatedTarget` at all — so focus
 * moving to a sibling *inside* its viewport cancelled the gesture there and
 * nowhere else. The resolution now lives in the mediator, which is the piece
 * already holding the host and the document.
 *
 * Folding it in is what stops a fifth coordinator from re-deriving the
 * ambiguity, and this guard is what stops an existing one from growing a second
 * answer beside it: containment cannot be re-decided without reading
 * `relatedTarget`, so the property is "no caller reads it". The roster is derived
 * from the call sites rather than declared, because a caller added later is
 * otherwise *invisible* to the claim — the same reason
 * `dismissible-layer-adopters.spec.ts` and `roving-tabindex-adopters.spec.ts`
 * derive theirs.
 *
 * The first three cases are liveness probes: a mis-typed glob returns an empty
 * record, a renamed mediator reports zero callers, and a resolution that stopped
 * reading `relatedTarget` or stopped deferring would make the central assertion
 * pass for the wrong reason.
 */
const SOURCES = import.meta.glob('/projects/forty-cdk/*/src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const MEDIATOR = 'createKeyboardDragMediator';

const pathOf = (key: string): string => key.replace(/^\/projects\/forty-cdk\//, '');

/**
 * Source with comments removed, so prose naming a symbol is not read as a use of
 * it — the anchoring failure the marker rules hit in
 * [#1606](https://github.com/tutkli/forty-cdk/issues/1606).
 */
const stripComments = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const LIBRARY_SOURCES: ReadonlyArray<readonly [string, string]> = Object.entries(SOURCES)
  .filter(([key]) => !key.endsWith('.spec.ts'))
  .map(([key, source]) => [pathOf(key), stripComments(source as string)] as const);

const SPEC_SOURCES = new Map<string, string>(
  Object.entries(SOURCES)
    .filter(([key]) => key.endsWith('.spec.ts'))
    .map(([key, source]) => [pathOf(key), source as string] as const),
);

/**
 * The file declaring the mediator, found by condition rather than by path so
 * moving `core/drag-session/` cannot silently drop it from the filter.
 */
function mediatorSource(): readonly [string, string] {
  const found = LIBRARY_SOURCES.find(([, source]) =>
    source.includes(`export function ${MEDIATOR}(`),
  );
  expect(found).toBeDefined();
  return found!;
}

/** Every library file that calls the mediator, i.e. every coordinator it serves. */
function callers(): string[] {
  const [declaringPath] = mediatorSource();
  return LIBRARY_SOURCES.filter(
    ([path, source]) =>
      path !== declaringPath && new RegExp(`[^A-Za-z]${MEDIATOR}\\(`).test(source),
  )
    .map(([path]) => path)
    .sort();
}

describe('keyboard drag focus-leave resolution (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('finds every coordinator the mediator serves', () => {
    expect(callers().length).toBeGreaterThanOrEqual(4);
  });

  it('resolves the leave in the mediator: containment plus a deferred re-check', () => {
    const [, source] = mediatorSource();
    expect(source).toContain('relatedTarget');
    expect(source).toContain('instanceof Node');
    expect(source).toContain('queueMicrotask');
    expect(source).toContain('activeElement');
  });

  it('has no coordinator answering "did focus leave?" a second time', () => {
    const second = callers().filter((path) => {
      const source = LIBRARY_SOURCES.find(([candidate]) => candidate === path)![1];
      return source.includes('relatedTarget');
    });
    expect(second).toEqual([]);
  });

  it('has every coordinator exercising the leave channel in its own spec', () => {
    const uncovered = callers().filter((path) => {
      const spec = SPEC_SOURCES.get(path.replace(/\.ts$/, '.spec.ts'));
      return spec === undefined || !spec.includes('focusout');
    });
    expect(uncovered).toEqual([]);
  });
});
