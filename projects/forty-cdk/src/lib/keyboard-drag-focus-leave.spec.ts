import { LIBRARY_CODE, SPEC_SOURCES } from '../test-utils/source-scan';

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
const MEDIATOR = 'createKeyboardDragMediator';

/**
 * The file declaring the mediator, found by condition rather than by path so
 * moving `core/drag-session/` cannot silently drop it from the filter.
 */
function mediatorSource(): readonly [string, string] {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes(`export function ${MEDIATOR}(`),
  );
  expect(found).toBeDefined();
  return found!;
}

/** Every library file that calls the mediator, i.e. every coordinator it serves. */
function callers(): string[] {
  const [declaringPath] = mediatorSource();
  return [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        path !== declaringPath && new RegExp(`[^A-Za-z]${MEDIATOR}\\(`).test(source),
    )
    .map(([path]) => path)
    .sort();
}

describe('keyboard drag focus-leave resolution (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
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
    const second = callers().filter((path) => LIBRARY_CODE.get(path)!.includes('relatedTarget'));
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
