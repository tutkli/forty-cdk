import { signal } from '@angular/core';

import { TableExpansion } from './table-expansion';

interface Row {
  id: number;
}

const byId = (a: unknown, b: unknown): boolean => (a as Row).id === (b as Row).id;

describe('TableExpansion', () => {
  it('isExpanded reports membership of the open-rows set', () => {
    const expanded = signal<readonly unknown[]>(['a']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expect(expansion.isExpanded('a')).toBe(true);
    expect(expansion.isExpanded('b')).toBe(false);
  });

  it('setExpanded(value, true) adds a closed value', () => {
    const expanded = signal<readonly unknown[]>([]);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.setExpanded('a', true);
    expect(expanded()).toEqual(['a']);
  });

  it('setExpanded(value, true) is a no-op when already open', () => {
    const expanded = signal<readonly unknown[]>(['a']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.setExpanded('a', true);
    expect(expanded()).toEqual(['a']);
  });

  it('setExpanded(value, false) removes an open value', () => {
    const expanded = signal<readonly unknown[]>(['a', 'b']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.setExpanded('a', false);
    expect(expanded()).toEqual(['b']);
  });

  it('setExpanded(value, false) is a no-op when already closed', () => {
    const expanded = signal<readonly unknown[]>(['b']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.setExpanded('a', false);
    expect(expanded()).toEqual(['b']);
  });

  it('setExpanded ignores an undefined value', () => {
    const expanded = signal<readonly unknown[]>([]);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.setExpanded(undefined, true);
    expect(expanded()).toEqual([]);
  });

  it('toggle flips an open value closed and a closed value open', () => {
    const expanded = signal<readonly unknown[]>(['a']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.toggle('a');
    expect(expanded()).toEqual([]);
    expansion.toggle('a');
    expect(expanded()).toEqual(['a']);
  });

  it('toggle ignores an undefined value', () => {
    const expanded = signal<readonly unknown[]>(['a']);
    const expansion = new TableExpansion({ expanded, compareWith: signal((a, b) => a === b) });
    expansion.toggle(undefined);
    expect(expanded()).toEqual(['a']);
  });

  it('uses the supplied comparator for object identity', () => {
    const expanded = signal<readonly unknown[]>([{ id: 1 }]);
    const expansion = new TableExpansion({ expanded, compareWith: signal(byId) });
    expect(expansion.isExpanded({ id: 1 })).toBe(true);
    expansion.toggle({ id: 1 });
    expect(expanded()).toEqual([]);
  });
});
