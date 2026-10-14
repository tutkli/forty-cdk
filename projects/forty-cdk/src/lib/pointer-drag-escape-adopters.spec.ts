import { LIBRARY_CODE } from '../test-utils/source-scan';

const MEDIATOR = 'createKeyboardDragMediator';
const SESSION = 'createPointerDragSession';

function declaringPath(symbol: string): string {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes(`export function ${symbol}(`),
  );
  expect(found).toBeDefined();
  return found![0];
}

function calls(source: string, symbol: string): boolean {
  return new RegExp(`[^A-Za-z#.]${symbol}\\(`).test(source);
}

function sessionOptions(source: string): string[] {
  const literals: string[] = [];
  const pattern = new RegExp(`[^A-Za-z#.]${SESSION}\\(\\{`, 'g');
  for (const match of source.matchAll(pattern)) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      const char = source[i];
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          literals.push(source.slice(open, i + 1));
          break;
        }
      }
    }
  }
  return literals;
}

function cancelsOnEscape(literal: string): boolean {
  return /^\s*cancelOnEscape:\s*true,?\s*$/m.test(literal);
}

function reorderCoordinators(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  const declarations = new Set([declaringPath(MEDIATOR), declaringPath(SESSION)]);
  return [...sources]
    .filter(
      ([path, source]) =>
        !declarations.has(path) && calls(source, MEDIATOR) && calls(source, SESSION),
    )
    .map(([path]) => path)
    .sort();
}

describe('pointer drag Escape adoption on reorder coordinators (#2265)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('derives every coordinator wiring both a keyboard mediator and a pointer session', () => {
    expect(reorderCoordinators()).toEqual(
      expect.arrayContaining([
        'listbox/src/listbox-reorder.ts',
        'table/src/table-row-reorder.ts',
        'tree/src/tree-node-drag.ts',
        'virtual-reorder/src/virtual-reorder.ts',
      ]),
    );
  });

  it('reads the options object of every pointer session a coordinator creates', () => {
    for (const path of reorderCoordinators()) {
      expect(sessionOptions(LIBRARY_CODE.get(path)!).length, path).toBeGreaterThan(0);
    }
  });

  it('extracts a nested options object whole and tells an opted-in session from one that is not', () => {
    const source = [
      'createKeyboardDragMediator({ host });',
      'this.a = createPointerDragSession({',
      '  host,',
      '  onMove: (event) => { this.move(event); },',
      '  cancelOnEscape: true,',
      '});',
      'this.b = createPointerDragSession({',
      '  host,',
      '  onCancel: () => { this.cancel({ cancelOnEscape: true }); },',
      '});',
    ].join('\n');

    const literals = sessionOptions(source);

    expect(literals).toHaveLength(2);
    expect(literals.map(cancelsOnEscape)).toEqual([true, false]);
  });

  it('has every reorder coordinator cancel its pointer drag on Escape', () => {
    const missing = reorderCoordinators().filter((path) =>
      sessionOptions(LIBRARY_CODE.get(path)!).some((literal) => !cancelsOnEscape(literal)),
    );

    expect(missing).toEqual([]);
  });
});
