import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * A drag item or a co-located draggable is found through the registered items and the core
 * marker, never through a selector attribute: Angular renders none on a host that receives its
 * directive through `hostDirectives`, and a subclass with its own selector carries none either
 * ([#2716](https://github.com/tutkli/forty-cdk/issues/2716)). The behaviour of each adopter under
 * those wrapping shapes is asserted in its own entry point's spec.
 */

const SELECTOR_LOOKUP =
  /\.(?:closest|hasAttribute|matches|querySelector|querySelectorAll)\s*(?:<[^>]*>)?\(\s*['"`][^'"`]*\bfor[A-Z]\w*/g;
const DRAG_ITEM_SELECTOR_LOOKUP =
  /\.(?:closest|hasAttribute|matches|querySelector|querySelectorAll)\s*(?:<[^>]*>)?\(\s*['"`][^'"`]*\bfor(?:Draggable|FreeDrag|TableRow|DropList)\b/g;

const sorted = (values: Iterable<string>): string[] => [...values].sort();

/** Drop-list coordinators that run their own pointer session over the list's items. */
function coordinators(): string[] {
  return sorted(
    [...LIBRARY_CODE]
      .filter(
        ([, code]) =>
          /provide:\s*FOR_DROP_LIST_COORDINATOR\b/.test(code) &&
          code.includes('createPointerDragSession('),
      )
      .map(([path]) => path),
  );
}

/** Pieces outside drag-drop that read a co-located draggable's state off their own host. */
function yieldingPieces(): string[] {
  return sorted(
    [...LIBRARY_CODE]
      .filter(
        ([path, code]) =>
          entryPointOf(path) !== 'drag-drop' &&
          /\.hasAttribute\(\s*'data-dragging'\s*\)/.test(code),
      )
      .map(([path]) => path),
  );
}

describe('drag host resolution adopters (#2716)', () => {
  it('derives a non-empty set of coordinators and yielding pieces', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
    expect(coordinators().length).toBeGreaterThanOrEqual(2);
    expect(yieldingPieces().length).toBeGreaterThanOrEqual(2);
  });

  it('every coordinator resolves the pressed item through resolvePressedDragItem', () => {
    const missing = coordinators().filter(
      (path) => !LIBRARY_CODE.get(path)!.includes('resolvePressedDragItem('),
    );

    expect(missing).toEqual([]);
  });

  it('every yielding piece detects its draggable through the core marker', () => {
    const missing = yieldingPieces().filter(
      (path) => !LIBRARY_CODE.get(path)!.includes('injectHostCarriesDragItem('),
    );

    expect(missing).toEqual([]);
  });

  it('no adopter looks a piece up by a for… selector attribute', () => {
    const offenders = [...coordinators(), ...yieldingPieces()].flatMap((path) =>
      [...LIBRARY_CODE.get(path)!.matchAll(SELECTOR_LOOKUP)].map((match) => `${path}: ${match[0]}`),
    );

    expect(offenders).toEqual([]);
  });

  it('no library source finds a drag item, a row or a drop list by its selector attribute', () => {
    const offenders = [...LIBRARY_CODE].flatMap(([path, code]) =>
      [...code.matchAll(DRAG_ITEM_SELECTOR_LOOKUP)].map((match) => `${path}: ${match[0]}`),
    );

    expect(offenders).toEqual([]);
  });

  it('the selector-lookup patterns still match the shapes they were written for', () => {
    const probe = [
      "target.closest<HTMLElement>('[forDraggable]')",
      "el.hasAttribute('forFreeDrag')",
      "target.closest('[forTableRow]')",
    ].join('\n');

    expect([...probe.matchAll(DRAG_ITEM_SELECTOR_LOOKUP)]).toHaveLength(3);
    expect([...probe.matchAll(SELECTOR_LOOKUP)]).toHaveLength(3);
  });
});
