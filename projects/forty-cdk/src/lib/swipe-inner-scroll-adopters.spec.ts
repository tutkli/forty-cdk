import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const SWIPE_CALL = /(?:^|[^A-Za-z])attachSwipeDismiss\(\{/;
const CAN_BEGIN = /\bcanBegin\s*:/;
const MOVE_TARGET = /originalEvent\s*\.\s*target\b/;
const SHARED_GUARD = /\bisScrollableAtEdge\(\s*[\w.]*\.target\b/;
const HAND_ROLLED_SCROLL = /\.scroll(?:Top|Left|Height|Width)\b/;

function gatedCallers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(
      ([path, code]) =>
        entryPointOf(path) !== 'core' && SWIPE_CALL.test(code) && CAN_BEGIN.test(code),
    )
    .map(([path]) => path)
    .sort();
}

function violations(path: string, code: string): string[] {
  const found: string[] = [];
  if (MOVE_TARGET.test(code)) {
    found.push(`${path} reads originalEvent.target instead of the press target`);
  }
  if (!SHARED_GUARD.test(code)) {
    found.push(`${path} does not hand the press target to isScrollableAtEdge`);
  }
  if (HAND_ROLLED_SCROLL.test(code)) {
    found.push(`${path} reads scroll metrics itself instead of through isScrollableAtEdge`);
  }
  return found;
}

describe('swipe callers that gate the start test the press through the shared guard', () => {
  it('derives a live family of gated swipe callers', () => {
    expect(gatedCallers()).toEqual(
      expect.arrayContaining(['carousel/src/carousel-drag.ts', 'drawer/src/drawer-drag.ts']),
    );
  });

  it('reports a move-target read, a missing guard and a hand-rolled scroll check', () => {
    const sources = new Map([
      [
        'a/src/a.ts',
        `attachSwipeDismiss({ canBegin: (d) => !isScrollableAtEdge(d.originalEvent.target as Element, d.direction) });`,
      ],
      ['b/src/b.ts', 'attachSwipeDismiss({ canBegin: (d) => d.target !== null });'],
      [
        'c/src/c.ts',
        'attachSwipeDismiss({ canBegin: (d) => !isScrollableAtEdge(d.target, d.direction) && el.scrollTop === 0 });',
      ],
      [
        'd/src/d.ts',
        'attachSwipeDismiss({ canBegin: (d) => !isScrollableAtEdge(d.target, d.direction) });',
      ],
      ['e/src/e.ts', 'attachSwipeDismiss({ getThreshold: () => 1 });'],
    ]);

    expect(gatedCallers(sources)).toEqual(['a/src/a.ts', 'b/src/b.ts', 'c/src/c.ts', 'd/src/d.ts']);
    expect(gatedCallers(sources).flatMap((path) => violations(path, sources.get(path)!))).toEqual([
      'a/src/a.ts reads originalEvent.target instead of the press target',
      'b/src/b.ts does not hand the press target to isScrollableAtEdge',
      'c/src/c.ts reads scroll metrics itself instead of through isScrollableAtEdge',
    ]);
  });

  for (const path of gatedCallers()) {
    it(`${path} tests the press target through isScrollableAtEdge`, () => {
      expect(violations(path, LIBRARY_CODE.get(path)!)).toEqual([]);
    });
  }
});
