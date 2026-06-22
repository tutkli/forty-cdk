import { signal } from '@angular/core';

import { defaultItemToFormValue, isInArray, singleSelected, toggleInArray } from './selection';

const strictEquals = <T>(a: T, b: T) => a === b;

interface Item {
  id: number;
  name: string;
}

const byId = (a: Item, b: Item) => a.id === b.id;

describe('isInArray', () => {
  it('returns true when an equal element is present', () => {
    expect(isInArray(['a', 'b', 'c'], 'b', strictEquals)).toBe(true);
  });

  it('returns false when no element matches', () => {
    expect(isInArray(['a', 'b'], 'c', strictEquals)).toBe(false);
  });

  it('returns false for an empty array', () => {
    expect(isInArray([], 'a', strictEquals)).toBe(false);
  });

  it('uses the supplied comparator for object identity', () => {
    const current: Item[] = [
      { id: 1, name: 'one' },
      { id: 2, name: 'two' },
    ];
    expect(isInArray(current, { id: 2, name: 'changed' }, byId)).toBe(true);
    expect(isInArray(current, { id: 3, name: 'three' }, byId)).toBe(false);
  });
});

describe('toggleInArray', () => {
  it('appends a missing element', () => {
    expect(toggleInArray(['a'], 'b', strictEquals)).toEqual(['a', 'b']);
  });

  it('removes an already-present element', () => {
    expect(toggleInArray(['a', 'b', 'c'], 'b', strictEquals)).toEqual(['a', 'c']);
  });

  it('appends to an empty array', () => {
    expect(toggleInArray([], 'a', strictEquals)).toEqual(['a']);
  });

  it('does not mutate the input array', () => {
    const current = ['a', 'b'];
    toggleInArray(current, 'c', strictEquals);
    toggleInArray(current, 'a', strictEquals);
    expect(current).toEqual(['a', 'b']);
  });

  it('toggles object items by comparator identity', () => {
    const a: Item = { id: 1, name: 'one' };
    const b: Item = { id: 2, name: 'two' };
    expect(toggleInArray([a], { id: 2, name: 'two' }, byId)).toEqual([a, { id: 2, name: 'two' }]);
    expect(toggleInArray([a, b], { id: 1, name: 'changed' }, byId)).toEqual([b]);
  });
});

describe('defaultItemToFormValue', () => {
  it('returns strings unchanged', () => {
    expect(defaultItemToFormValue('hello')).toBe('hello');
  });

  it('JSON-stringifies non-string items', () => {
    expect(defaultItemToFormValue({ id: 1 })).toBe('{"id":1}');
    expect(defaultItemToFormValue(42)).toBe('42');
    expect(defaultItemToFormValue(['a', 'b'])).toBe('["a","b"]');
  });
});

describe('singleSelected', () => {
  it('returns the sole element when the array has exactly one entry', () => {
    const value = signal<readonly string[]>(['only']);
    expect(singleSelected(value)()).toBe('only');
  });

  it('returns null for an empty array', () => {
    const value = signal<readonly string[]>([]);
    expect(singleSelected(value)()).toBe(null);
  });

  it('returns null when more than one element is present', () => {
    const value = signal<readonly string[]>(['a', 'b']);
    expect(singleSelected(value)()).toBe(null);
  });

  it('reacts to source changes without Zone.js', () => {
    const value = signal<readonly string[]>([]);
    const selected = singleSelected(value);
    expect(selected()).toBe(null);

    value.set(['x']);
    expect(selected()).toBe('x');

    value.set(['x', 'y']);
    expect(selected()).toBe(null);

    value.set([]);
    expect(selected()).toBe(null);
  });
});
