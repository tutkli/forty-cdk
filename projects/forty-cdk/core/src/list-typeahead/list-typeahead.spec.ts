import { Typeahead } from '../typeahead/typeahead';
import {
  isRangeSelectShortcut,
  resolveListTypeahead,
  throwUnsupportedVirtualizedRangeSelect,
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
  it('throws in dev mode with the primitive prefix and focus-model hint', () => {
    expect(() =>
      throwUnsupportedVirtualizedRangeSelect({
        primitive: 'listbox',
        focusModel: 'roving-tabindex',
      }),
    ).toThrow(/^\[forty-cdk\/listbox\] Multi-select range keyboard/);
    expect(() =>
      throwUnsupportedVirtualizedRangeSelect({ primitive: 'select', focusModel: 'DOM-focus' }),
    ).toThrow(/non-virtualized DOM-focus listbox/);
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
