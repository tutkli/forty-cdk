import { LIBRARY_CODE } from '../test-utils/source-scan';

const HELPER = 'focusWhenMounted';
const MEDIATOR = 'createKeyboardDragMediator';

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

function methodBodies(source: string): Map<string, string> {
  const bodies = new Map<string, string>();
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const name = /^ {2}(?:private |protected )?(#?\w+)\(/.exec(lines[i]!)?.[1];
    if (name === undefined) {
      continue;
    }
    let end = i;
    while (end < lines.length && lines[end] !== '  }') {
      end++;
    }
    bodies.set(name, lines.slice(i, end + 1).join('\n'));
    i = end;
  }
  return bodies;
}

function reachesHelper(body: string, bodies: Map<string, string>): boolean {
  if (calls(body, HELPER)) {
    return true;
  }
  return [...bodies].some(
    ([name, helper]) => body.includes(`this.${name}(`) && calls(helper, HELPER),
  );
}

function cancelPaths(path: string): string[] {
  return [...methodBodies(LIBRARY_CODE.get(path)!).values()].filter((body) =>
    /[aA]nnounceCancel\(/.test(body),
  );
}

function pinsLiftedItem(path: string): boolean {
  return /\.setReordering(Index|Row)\(/.test(LIBRARY_CODE.get(path)!);
}

function keyboardDropOwners(): string[] {
  const mediator = declaringPath(MEDIATOR);
  return [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        (path !== mediator && calls(source, MEDIATOR)) ||
        /class \w+ implements ForDropListContext\b/.test(source),
    )
    .map(([path]) => path)
    .sort();
}

describe('keyboard drop focus adoption (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds the shared helper in the internal core tier', () => {
    expect(declaringPath(HELPER)).toMatch(/^core\/src\//);
  });

  it('derives every owner of a keyboard drop: the drop list and each coordinator', () => {
    const owners = keyboardDropOwners();
    expect(owners).toContain('drag-drop/src/drop-list.ts');
    expect(owners.length).toBeGreaterThanOrEqual(5);
  });

  it('has every owner move focus after a drop through the shared helper', () => {
    const missing = keyboardDropOwners().filter((path) => !calls(LIBRARY_CODE.get(path)!, HELPER));
    expect(missing).toEqual([]);
  });

  it('has no owner registering a render hook of its own beside the helper', () => {
    const own = keyboardDropOwners().filter((path) =>
      /\bafter(Next|Every)Render\(/.test(LIBRARY_CODE.get(path)!),
    );
    expect(own).toEqual([]);
  });

  it('finds one announced cancel path per owner', () => {
    const counts = keyboardDropOwners().map((path) => [path, cancelPaths(path).length]);
    expect(counts.filter(([, n]) => n !== 1)).toEqual([]);
  });

  it('derives the owners whose gesture pins the lifted item past the window', () => {
    const pinning = keyboardDropOwners().filter(pinsLiftedItem);
    expect(pinning).toEqual(
      expect.arrayContaining([
        'table/src/table-row-reorder.ts',
        'virtual-reorder/src/virtual-reorder.ts',
      ]),
    );
  });

  it('has every pinning owner restore focus after a keyboard cancel through the shared helper', () => {
    const missing = keyboardDropOwners()
      .filter(pinsLiftedItem)
      .filter((path) => {
        const bodies = methodBodies(LIBRARY_CODE.get(path)!);
        return !cancelPaths(path).some((body) => reachesHelper(body, bodies));
      });
    expect(missing).toEqual([]);
  });

  it('has every other owner keep the lifted item mounted for the whole gesture', () => {
    const others = keyboardDropOwners().filter((path) => !pinsLiftedItem(path));
    expect(others).toEqual(
      expect.arrayContaining([
        'drag-drop/src/drop-list.ts',
        'listbox/src/listbox-reorder.ts',
        'tree/src/tree-node-drag.ts',
      ]),
    );
    const scrolling = others.filter((path) =>
      /\.scrollTo(Index|Row)\(/.test(LIBRARY_CODE.get(path)!),
    );
    expect(scrolling).toEqual([]);
  });

  it('has every owner cancel a pending focus step when a new gesture starts', () => {
    const missing = keyboardDropOwners().filter(
      (path) => !/Focus\??\.cancel\(\)/.test(LIBRARY_CODE.get(path)!),
    );
    expect(missing).toEqual([]);
  });
});

const PRESS_ARBITER = 'arbitrateLiftPress';
const KEY_CONSUMER = 'consumeUnmappedLiftedKey';

/**
 * Keyboard-drop owners that run no keyboard mediator and no pointer session of their own, each
 * with the condition that keeps the exclusion true.
 */
const LIFT_ARBITRATION_EXCLUSIONS: Readonly<Record<string, (source: string) => boolean>> = {
  'drag-drop/src/drop-list.ts': (source) =>
    !calls(source, MEDIATOR) &&
    !calls(source, 'createPointerDragSession') &&
    /#beginLift\([^)]*\): number \{\s*if \([^\n]*this\.isDragging\(\)/.test(source),
};

function callbackMethod(source: string, option: string): string | null {
  return (
    new RegExp(`${option}: \\(event\\) => this\\.(#\\w+)\\(event\\)`).exec(source)?.[1] ?? null
  );
}

function callbackReaches(path: string, option: string, helper: string): boolean {
  const source = LIBRARY_CODE.get(path)!;
  const method = callbackMethod(source, option);
  return method !== null && calls(methodBodies(source).get(method) ?? '', helper);
}

function arbitratedOwners(): string[] {
  return keyboardDropOwners().filter((path) => !(path in LIFT_ARBITRATION_EXCLUSIONS));
}

describe('keyboard lift arbitration (meta-guard)', () => {
  it('finds both arbitration helpers in the drag-session core', () => {
    expect(declaringPath(PRESS_ARBITER)).toMatch(/^core\/src\/drag-session\//);
    expect(declaringPath(KEY_CONSUMER)).toMatch(/^core\/src\/drag-session\//);
  });

  it('derives the four coordinators as the owners that arbitrate a live keyboard lift', () => {
    expect(arbitratedOwners()).toEqual([
      'listbox/src/listbox-reorder.ts',
      'table/src/table-row-reorder.ts',
      'tree/src/tree-node-drag.ts',
      'virtual-reorder/src/virtual-reorder.ts',
    ]);
  });

  it('keeps every exclusion true to the condition that justifies it', () => {
    const stale = Object.entries(LIFT_ARBITRATION_EXCLUSIONS).filter(
      ([path, holds]) => !keyboardDropOwners().includes(path) || !holds(LIBRARY_CODE.get(path)!),
    );
    expect(stale.map(([path]) => path)).toEqual([]);
  });

  it('has every owner arbitrate a pointer press against the keyboard lift from its canStart', () => {
    const missing = arbitratedOwners().filter(
      (path) => !callbackReaches(path, 'canStart', PRESS_ARBITER),
    );
    expect(missing).toEqual([]);
  });

  it('has every owner consume the keys its lifted keydown maps to no action', () => {
    const missing = arbitratedOwners().filter(
      (path) => !callbackReaches(path, 'onLiftedKeydown', KEY_CONSUMER),
    );
    expect(missing).toEqual([]);
  });
});
