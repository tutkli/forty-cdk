import { Typeahead } from './typeahead';
import {
  isRangeSelectShortcut,
  resolveListTypeahead,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
} from './list-typeahead';

function key(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', init);
}

describe('isRangeSelectShortcut', () => {
  const vertical = { orientation: 'vertical' as const, dir: 'ltr' as const };

  it('detects Ctrl/Cmd+A', () => {
    expect(isRangeSelectShortcut(key({ key: 'a', ctrlKey: true }), vertical)).toBe(true);
    expect(isRangeSelectShortcut(key({ key: 'A', metaKey: true }), vertical)).toBe(true);
  });

  it('detects Ctrl+Shift+Home / End', () => {
    expect(
      isRangeSelectShortcut(key({ key: 'Home', ctrlKey: true, shiftKey: true }), vertical),
    ).toBe(true);
    expect(
      isRangeSelectShortcut(key({ key: 'End', metaKey: true, shiftKey: true }), vertical),
    ).toBe(true);
  });

  it('detects Shift+Space', () => {
    expect(isRangeSelectShortcut(key({ key: ' ', shiftKey: true }), vertical)).toBe(true);
    expect(isRangeSelectShortcut(key({ key: 'Spacebar', shiftKey: true }), vertical)).toBe(true);
  });

  it('detects Shift+Arrow along the list axis', () => {
    expect(isRangeSelectShortcut(key({ key: 'ArrowDown', shiftKey: true }), vertical)).toBe(true);
    expect(isRangeSelectShortcut(key({ key: 'ArrowUp', shiftKey: true }), vertical)).toBe(true);
    expect(isRangeSelectShortcut(key({ key: 'ArrowLeft', shiftKey: true }), vertical)).toBe(false);
  });

  it('is false when Alt is held', () => {
    expect(isRangeSelectShortcut(key({ key: 'a', ctrlKey: true, altKey: true }), vertical)).toBe(
      false,
    );
    expect(
      isRangeSelectShortcut(key({ key: 'ArrowDown', shiftKey: true, altKey: true }), vertical),
    ).toBe(false);
  });

  it('is false for unmodified navigation and printable keys', () => {
    expect(isRangeSelectShortcut(key({ key: 'ArrowDown' }), vertical)).toBe(false);
    expect(isRangeSelectShortcut(key({ key: 'a' }), vertical)).toBe(false);
  });
});

describe('throwUnsupportedVirtualizedRangeSelect', () => {
  it('throws in dev mode under the primitive prefix and its own code', () => {
    expect(() =>
      throwUnsupportedVirtualizedRangeSelect({
        primitive: 'listbox',
        focusModel: 'roving-tabindex',
        collection: 'listbox',
        alternative: 'Toggle options individually with Enter, Space, or click',
      }),
    ).toThrow(/^\[forty-cdk\/listbox\] FORCDK-CORE-008: Multi-select range keyboard/);
  });

  it('composes the per-primitive alternative with the shared focus-model hint', () => {
    expect(() =>
      throwUnsupportedVirtualizedRangeSelect({
        primitive: 'select',
        focusModel: 'DOM-focus',
        collection: 'listbox',
        alternative: 'Toggle options individually with Enter, Space, or click',
      }),
    ).toThrow(/Fix: Toggle options individually .*non-virtualized DOM-focus listbox/s);
  });

  it("carries the tree's own multi-select alternative rather than the listbox one", () => {
    expect(() =>
      throwUnsupportedVirtualizedRangeSelect({
        primitive: 'tree',
        focusModel: 'roving-tabindex',
        collection: 'tree',
        alternative: 'Use `selectionMode="checkbox"` for multi-select over large virtualized trees',
      }),
    ).toThrow(/Fix: Use `selectionMode="checkbox"`.*non-virtualized roving-tabindex tree/s);
  });
});

describe('throwUnsupportedVirtualizedSelectionFollowsFocus', () => {
  it('throws in dev mode with the primitive prefix and the per-collection hint', () => {
    expect(() =>
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'listbox',
        focusModel: 'roving-tabindex',
        collection: 'listbox',
      }),
    ).toThrow(/^\[forty-cdk\/listbox\] FORCDK-CORE-009: `selectionFollowsFocus` is not supported/);
    expect(() =>
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'select',
        focusModel: 'DOM-focus',
        collection: 'listbox',
      }),
    ).toThrow(/non-virtualized DOM-focus listbox\.$/);
    expect(() =>
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'tree',
        focusModel: 'roving-tabindex',
        collection: 'tree',
      }),
    ).toThrow(/^\[forty-cdk\/tree\][\s\S]*non-virtualized roving-tabindex tree\.$/);
  });
});

describe('resolveListTypeahead', () => {
  interface Item {
    readonly text: string;
    readonly disabled: boolean;
  }
  const items: readonly Item[] = [
    { text: 'Apple', disabled: false },
    { text: 'Apricot', disabled: false },
    { text: 'Banana', disabled: false },
    { text: 'Cherry', disabled: true },
  ];
  const config = {
    items,
    anchorIndex: -1,
    getText: (i: Item) => i.text,
    isDisabled: (i: Item) => i.disabled,
  };

  it('reports not handled for a non-printable key', () => {
    const typeahead = new Typeahead();
    const result = resolveListTypeahead(typeahead, key({ key: 'ArrowDown' }), config);
    expect(result.handled).toBe(false);
    expect(result.match).toBeNull();
  });

  it('resolves a prefix match from the anchor', () => {
    const typeahead = new Typeahead();
    const result = resolveListTypeahead(typeahead, key({ key: 'b' }), config);
    expect(result.handled).toBe(true);
    expect(result.match?.text).toBe('Banana');
  });

  it('cycles among same-initial options on a repeated key from the anchor', () => {
    const typeahead = new Typeahead();
    const first = resolveListTypeahead(typeahead, key({ key: 'a' }), config);
    expect(first.match?.text).toBe('Apple');
    const second = resolveListTypeahead(typeahead, key({ key: 'a' }), {
      ...config,
      anchorIndex: 0,
    });
    expect(second.match?.text).toBe('Apricot');
  });

  it('skips disabled options', () => {
    const typeahead = new Typeahead();
    const result = resolveListTypeahead(typeahead, key({ key: 'c' }), config);
    expect(result.handled).toBe(true);
    expect(result.match).toBeNull();
  });
});
