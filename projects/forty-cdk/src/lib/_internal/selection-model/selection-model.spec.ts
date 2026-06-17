import { signal } from '@angular/core';

import { SelectionModel } from './selection-model';

interface Item {
  id: number;
  name: string;
}

describe('SelectionModel', () => {
  describe('single mode (default)', () => {
    it('select replaces the prior selection with the new value', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src);
      model.select('a');
      expect(model.selected()).toEqual(['a']);
      model.select('b');
      expect(model.selected()).toEqual(['b']);
      expect(model.isSelected('a')).toBe(false);
    });

    it('select with multiple values keeps only the last one', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src);
      model.select('a', 'b', 'c');
      expect(model.selected()).toEqual(['c']);
    });

    it('select returns false when the same value is already selected', () => {
      const src = signal<readonly string[]>(['a']);
      const model = new SelectionModel(src);
      const changed = model.select('a');
      expect(changed).toBe(false);
      expect(model.selected()).toEqual(['a']);
    });
  });

  describe('multiple mode', () => {
    it('select appends values not already present', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src, { multiple: true });
      model.select('a');
      model.select('b');
      expect(model.selected()).toEqual(['a', 'b']);
    });

    it('select returns false and does not duplicate an already-present value', () => {
      const src = signal<readonly string[]>(['a']);
      const model = new SelectionModel(src, { multiple: true });
      const changed = model.select('a');
      expect(changed).toBe(false);
      expect(model.selected()).toEqual(['a']);
    });

    it('select returns true when a new value is added', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src, { multiple: true });
      const changed = model.select('a');
      expect(changed).toBe(true);
    });
  });

  describe('compareWith', () => {
    it('uses the custom comparator for membership checks', () => {
      const src = signal<readonly Item[]>([{ id: 1, name: 'one' }]);
      const model = new SelectionModel(src, {
        multiple: true,
        compareWith: (a, b) => a.id === b.id,
      });
      expect(model.isSelected({ id: 1, name: 'changed' })).toBe(true);
      expect(model.isSelected({ id: 2, name: 'two' })).toBe(false);
    });

    it('deselect removes by comparator identity', () => {
      const src = signal<readonly Item[]>([
        { id: 1, name: 'one' },
        { id: 2, name: 'two' },
      ]);
      const model = new SelectionModel(src, {
        multiple: true,
        compareWith: (a, b) => a.id === b.id,
      });
      model.deselect({ id: 2, name: 'whatever' });
      expect(model.selected()).toEqual([{ id: 1, name: 'one' }]);
    });
  });

  describe('deltas', () => {
    it('added / removed reflect the most recent mutation', () => {
      const src = signal<readonly string[]>(['a']);
      const model = new SelectionModel(src, { multiple: true });
      model.select('b');
      expect(model.added()).toEqual(['b']);
      expect(model.removed()).toEqual([]);
    });

    it('setSelection reports replaced items as added and removed', () => {
      const src = signal<readonly string[]>(['a', 'b']);
      const model = new SelectionModel(src, { multiple: true });
      model.setSelection('c');
      expect(model.added()).toEqual(['c']);
      expect(model.removed()).toEqual(['a', 'b']);
    });
  });

  describe('toggle', () => {
    it('toggles a value in then out', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src, { multiple: true });
      const first = model.toggle('x');
      expect(first).toBe(true);
      expect(model.selected()).toEqual(['x']);
      const second = model.toggle('x');
      expect(second).toBe(true);
      expect(model.selected()).toEqual([]);
    });
  });

  describe('setSelection', () => {
    it('replaces the entire selection', () => {
      const src = signal<readonly string[]>(['a', 'b']);
      const model = new SelectionModel(src, { multiple: true });
      model.setSelection('c', 'd');
      expect(model.selected()).toEqual(['c', 'd']);
    });

    it('de-duplicates values', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src, { multiple: true });
      model.setSelection('a', 'a', 'b');
      expect(model.selected()).toEqual(['a', 'b']);
    });
  });

  describe('clear', () => {
    it('empties the selection and returns true', () => {
      const src = signal<readonly string[]>(['a', 'b']);
      const model = new SelectionModel(src, { multiple: true });
      const changed = model.clear();
      expect(changed).toBe(true);
      expect(model.selected()).toEqual([]);
    });

    it('returns false when already empty', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src);
      const changed = model.clear();
      expect(changed).toBe(false);
    });
  });

  describe('return values', () => {
    it('select returns true on change and false on no-op', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src);
      expect(model.select('a')).toBe(true);
      expect(model.select('a')).toBe(false);
    });

    it('deselect returns true when an item was removed', () => {
      const src = signal<readonly string[]>(['a']);
      const model = new SelectionModel(src);
      expect(model.deselect('a')).toBe(true);
    });

    it('deselect returns false when no matching item exists', () => {
      const src = signal<readonly string[]>([]);
      const model = new SelectionModel(src);
      expect(model.deselect('z')).toBe(false);
    });
  });

  describe('reactive multiple signal', () => {
    it('respects a Signal<boolean> for the multiple option', () => {
      const src = signal<readonly string[]>([]);
      const multSig = signal(false);
      const model = new SelectionModel(src, { multiple: multSig });

      model.select('a');
      model.select('b');
      expect(model.selected()).toEqual(['b']);

      multSig.set(true);
      model.select('c');
      expect(model.selected()).toEqual(['b', 'c']);
    });
  });
});
