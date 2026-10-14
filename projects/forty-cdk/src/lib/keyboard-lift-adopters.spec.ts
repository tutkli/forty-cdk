import { LIBRARY_CODE } from '../test-utils/source-scan';

const MEDIATOR = 'createKeyboardDragMediator';
const RESOLVER = 'isDragLiftKey';

interface PlainLiftExclusion {
  readonly reason: string;
  readonly holds: (code: string) => boolean;
}

const PLAIN_LIFT_EXCLUSIONS: Readonly<Record<string, PlainLiftExclusion>> = {
  'virtual-reorder/src/virtual-reorder.ts': {
    reason:
      'its rows are [forDraggable] items with no selection of their own, so they lift on plain Space / Enter like any drag-drop item',
    holds: (code) =>
      /key !== ' ' && key !== 'Enter'/.test(code) && !new RegExp(`\\b${RESOLVER}\\(`).test(code),
  },
};

const HAND_ROLLED_CHORD =
  /\b(?:ctrlKey|metaKey|altKey)\b|shiftKey[^;]{0,80}'(?:Enter| )'|'(?:Enter| )'[^;]{0,80}shiftKey/;

function declaringPath(symbol: string): string {
  const found = [...LIBRARY_CODE].find(([, code]) => code.includes(`export function ${symbol}(`));
  expect(found, `no library source declares ${symbol}`).toBeDefined();
  return found![0];
}

function callers(): string[] {
  const declaring = declaringPath(MEDIATOR);
  return [...LIBRARY_CODE]
    .filter(
      ([path, code]) => path !== declaring && new RegExp(`[^A-Za-z]${MEDIATOR}\\(`).test(code),
    )
    .map(([path]) => path)
    .sort();
}

function chordLifters(): string[] {
  return callers().filter((path) => new RegExp(`\\b${RESOLVER}\\(`).test(LIBRARY_CODE.get(path)!));
}

describe('keyboard reorder coordinators lift through the scope liftKey (#2234)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds every coordinator the mediator serves', () => {
    expect(callers().length).toBeGreaterThanOrEqual(4);
    expect(chordLifters()).toContain('listbox/src/listbox-reorder.ts');
  });

  it('routes every coordinator that does not lift on plain Space / Enter through the shared resolver', () => {
    const unrouted = callers().filter(
      (path) => !chordLifters().includes(path) && !(path in PLAIN_LIFT_EXCLUSIONS),
    );
    expect(
      unrouted,
      `a reorder coordinator next to a selectable collection lifts through ${RESOLVER}(event, <FOR_DRAG_DROP_DEFAULTS>.liftKey)`,
    ).toEqual([]);
  });

  it('keeps every plain-lift exclusion true', () => {
    for (const [path, { reason, holds }] of Object.entries(PLAIN_LIFT_EXCLUSIONS)) {
      expect(callers(), `${path} no longer calls ${MEDIATOR}`).toContain(path);
      expect(holds(LIBRARY_CODE.get(path)!), `${path}: ${reason}`).toBe(true);
    }
  });

  it('passes the scope liftKey from FOR_DRAG_DROP_DEFAULTS to every resolver call', () => {
    for (const path of chordLifters()) {
      const code = LIBRARY_CODE.get(path)!;
      const calls = code.match(new RegExp(`\\b${RESOLVER}\\(`, 'g'))!.length;
      const routed = [
        ...code.matchAll(new RegExp(`\\b${RESOLVER}\\(event, this\\.#(\\w+)\\.liftKey\\)`, 'g')),
      ];

      expect(routed.length, `${path}: every ${RESOLVER} call passes a liftKey`).toBe(calls);
      for (const [, field] of routed) {
        expect(code, `${path}: #${field} is not the drag-drop defaults`).toMatch(
          new RegExp(`#${field} = inject\\(FOR_DRAG_DROP_DEFAULTS\\)`),
        );
      }
    }
  });

  it('has no coordinator testing a lift chord by hand', () => {
    const handRolled = callers().filter((path) => HAND_ROLLED_CHORD.test(LIBRARY_CODE.get(path)!));
    expect(handRolled).toEqual([]);
  });

  it('defers the binding itself to the scope, guarding only IME composition', () => {
    const code = LIBRARY_CODE.get(declaringPath(RESOLVER))!;
    expect(code).toContain('liftKey(event)');
    expect(code).toContain('isImeComposing(event)');
    expect(code).not.toMatch(/\b(?:ctrlKey|metaKey|shiftKey)\b/);
  });
});
