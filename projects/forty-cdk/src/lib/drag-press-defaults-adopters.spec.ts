import { LIBRARY_CODE, SPEC_CODE } from '../test-utils/source-scan';

const SESSION = 'createPointerDragSession';
const NATIVE_DRAG_CASE = 'dragStartFromPress';

const OWN_DRAGSTART = new Set(['carousel/src/carousel-drag.ts']);

const SESSION_ADOPTER_SPECS: Readonly<Record<string, string>> = {
  'core/src/swipe-dismiss/swipe-dismiss.ts': 'core/src/swipe-dismiss/swipe-dismiss.spec.ts',
  'drag-drop/src/draggable.ts': 'drag-drop/src/drag-drop.spec.ts',
  'drag-drop/src/free-drag.ts': 'drag-drop/src/free-drag.spec.ts',
  'listbox/src/listbox-reorder.ts': 'listbox/src/listbox-reorder.spec.ts',
  'pane-resizer/src/pane-resizer.ts': 'pane-resizer/src/pane-resizer.spec.ts',
  'slider/src/slider.ts': 'slider/src/slider.spec.ts',
  'table/src/table-column-resizer.ts': 'table/src/table.spec.ts',
  'table/src/table-row-reorder.ts': 'table/src/table-row-reorder.spec.ts',
  'tree/src/tree-node-drag.ts': 'tree/src/tree-node-drag.spec.ts',
  'virtual-reorder/src/virtual-reorder.ts': 'virtual-reorder/src/virtual-reorder.spec.ts',
};

function calls(source: string, symbol: string): boolean {
  return new RegExp(`[^A-Za-z#.]${symbol}\\(`).test(source);
}

function callCount(source: string, symbol: string): number {
  return [...source.matchAll(new RegExp(`[^A-Za-z#.]${symbol}\\(`, 'g'))].length;
}

function declaringPath(symbol: string): string {
  const found = [...LIBRARY_CODE].find(([, source]) =>
    source.includes(`export function ${symbol}(`),
  );
  expect(found, symbol).toBeDefined();
  return found![0];
}

function sessionAdopters(): string[] {
  const declaration = declaringPath(SESSION);
  return [...LIBRARY_CODE]
    .filter(([path, source]) => path !== declaration && calls(source, SESSION))
    .map(([path]) => path)
    .sort();
}

function bindsOwnDragStart(source: string): boolean {
  return (
    /['"]\(dragstart\)['"]\s*:/.test(source) ||
    /addEventListener\(\s*['"]dragstart['"]/.test(source)
  );
}

function dragHandlePieces(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, source]) => /selector:\s*'\[for[A-Za-z]*Handle\]'/.test(source))
    .map(([path]) => path)
    .sort();
}

function touchActionBinding(source: string): string | null {
  return /'\[style\.touch-action\]':\s*'([^']*)'/.exec(source)?.[1] ?? null;
}

function handleTouchActionProducers(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, source]) => /handleTouchAction(?::|\s*=)\s*computed\(/.test(source))
    .map(([path]) => path)
    .sort();
}

function swipeTouchActionCallers(): string[] {
  const declaration = declaringPath('swipeTouchAction');
  return [...LIBRARY_CODE]
    .filter(([path, source]) => path !== declaration && calls(source, 'swipeTouchAction'))
    .map(([path]) => path)
    .sort();
}

describe('drag press defaults: native drag and touch-action live in forty-cdk/core (#2715)', () => {
  it('finds the library sources and specs through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
    expect(SPEC_CODE.size).toBeGreaterThan(100);
  });

  it('cancels native drag in the pointer session itself', () => {
    expect(bindsOwnDragStart(LIBRARY_CODE.get(declaringPath(SESSION))!)).toBe(true);
  });

  it('lets no library directive other than ForCarouselDrag bind its own dragstart', () => {
    const session = declaringPath(SESSION);
    const binders = [...LIBRARY_CODE]
      .filter(([path, source]) => path !== session && bindsOwnDragStart(source))
      .map(([path]) => path);

    expect(binders.filter((path) => !OWN_DRAGSTART.has(path))).toEqual([]);
    for (const path of OWN_DRAGSTART) {
      expect(binders, `${path} no longer binds dragstart; drop it from OWN_DRAGSTART`).toContain(
        path,
      );
    }
  });

  it('tells a dragstart binding from a mention of the event', () => {
    expect(bindsOwnDragStart(`host: { '(dragstart)': 'onDragStart($event)' }`)).toBe(true);
    expect(bindsOwnDragStart(`host.addEventListener('dragstart', listener)`)).toBe(true);
    expect(bindsOwnDragStart(`const event = new Event('dragstart');`)).toBe(false);
  });

  it('names a spec for every pointer session adopter, and only for those', () => {
    expect(sessionAdopters()).toEqual(Object.keys(SESSION_ADOPTER_SPECS).sort());
  });

  it('has each pointer session adopter prove a press cancels the native drag', () => {
    const missing = Object.entries(SESSION_ADOPTER_SPECS)
      .filter(([, spec]) => callCount(SPEC_CODE.get(spec) ?? '', NATIVE_DRAG_CASE) === 0)
      .map(([path, spec]) => `${path} (in ${spec})`);

    expect(missing).toEqual([]);
  });

  it('derives every drag handle piece', () => {
    expect(dragHandlePieces()).toEqual(
      expect.arrayContaining([
        'drag-drop/src/drag-handle.ts',
        'drawer/src/drawer-handle.ts',
        'tree/src/tree-node-drag-handle.ts',
      ]),
    );
  });

  it('has every drag handle bind its touch-action through dragHandleTouchAction', () => {
    const offenders = dragHandlePieces().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      const binding = touchActionBinding(source);
      if (binding === null) {
        return true;
      }
      return !calls(source, 'dragHandleTouchAction') && !/\.handleTouchAction\(\)$/.test(binding);
    });

    expect(offenders).toEqual([]);
  });

  it('computes every handleTouchAction a handle reads with dragHandleTouchAction', () => {
    const producers = handleTouchActionProducers();

    expect(producers).toEqual(
      expect.arrayContaining(['drag-drop/src/handle-guard.ts', 'drawer/src/drawer-drag.ts']),
    );
    expect(
      producers.filter((path) => !calls(LIBRARY_CODE.get(path)!, 'dragHandleTouchAction')),
    ).toEqual([]);
  });

  it('computes the drag-drop surface touch-action with dragSurfaceTouchAction', () => {
    expect(
      calls(LIBRARY_CODE.get('drag-drop/src/handle-guard.ts')!, 'dragSurfaceTouchAction'),
    ).toBe(true);
  });

  it('has every swipeTouchAction caller pass the axes its host scrolls on', () => {
    const callers = swipeTouchActionCallers();

    expect(callers).toEqual(
      expect.arrayContaining(['drawer/src/drawer-drag.ts', 'toast/src/toast.ts']),
    );
    expect(
      callers.filter((path) => !calls(LIBRARY_CODE.get(path)!, 'injectHostScrollAxes')),
    ).toEqual([]);
  });
});
