import { signal, type WritableSignal } from '@angular/core';

import { TableRowSelection, type TableRowSelectionDeps } from './table-row-selection';
import type { TableSelectionBehavior, TableSelectionMode } from './table-context';

interface Setup {
  readonly selection: WritableSignal<readonly unknown[]>;
  readonly selectionMode: WritableSignal<TableSelectionMode>;
  readonly selectionBehavior: WritableSignal<TableSelectionBehavior>;
  readonly aggregateValues: WritableSignal<readonly unknown[]>;
  readonly model: TableRowSelection;
}

function setup(overrides?: Partial<TableRowSelectionDeps>): Setup {
  const selection = signal<readonly unknown[]>([]);
  const selectionMode = signal<TableSelectionMode>('multiple');
  const selectionBehavior = signal<TableSelectionBehavior>('toggle');
  const aggregateValues = signal<readonly unknown[]>(['a', 'b', 'c', 'd']);
  const model = new TableRowSelection({
    selection,
    selectionMode,
    selectionBehavior,
    compareWith: signal((a, b) => a === b),
    aggregateValues,
    ...overrides,
  });
  return { selection, selectionMode, selectionBehavior, aggregateValues, model };
}

describe('TableRowSelection', () => {
  describe('toggle', () => {
    it('flips a value in and out of the selection', () => {
      const { selection, model } = setup();
      model.toggle('a');
      expect(selection()).toEqual(['a']);
      model.toggle('a');
      expect(selection()).toEqual([]);
    });

    it('is a no-op in none mode', () => {
      const { selection, model } = setup({ selectionMode: signal('none') });
      model.toggle('a');
      expect(selection()).toEqual([]);
    });

    it('replaces in single mode', () => {
      const { selection, model } = setup({ selectionMode: signal('single') });
      model.toggle('a');
      model.toggle('b');
      expect(selection()).toEqual(['b']);
    });
  });

  describe('select with toggle behavior', () => {
    it('always flips regardless of modifiers', () => {
      const { selection, model } = setup();
      model.select('a');
      expect(selection()).toEqual(['a']);
      model.select('a', { ctrlKey: true });
      expect(selection()).toEqual([]);
    });
  });

  describe('select with replace behavior', () => {
    it('replaces the selection with the clicked row', () => {
      const { selection, model } = setup({ selectionBehavior: signal('replace') });
      model.select('a');
      expect(selection()).toEqual(['a']);
      model.select('b');
      expect(selection()).toEqual(['b']);
    });

    it('Ctrl-click toggles a single row in multiple mode', () => {
      const { selection, model } = setup({ selectionBehavior: signal('replace') });
      model.select('a');
      model.select('b', { ctrlKey: true });
      expect(selection()).toEqual(['a', 'b']);
      model.select('a', { metaKey: true });
      expect(selection()).toEqual(['b']);
    });

    it('Shift-click extends a range from the anchor', () => {
      const { selection, model } = setup({ selectionBehavior: signal('replace') });
      model.select('b');
      model.select('d', { shiftKey: true });
      expect(selection()).toEqual(['b', 'c', 'd']);
    });

    it('Shift-click extends a backwards range from the anchor', () => {
      const { selection, model } = setup({ selectionBehavior: signal('replace') });
      model.select('d');
      model.select('b', { shiftKey: true });
      expect(selection()).toEqual(['b', 'c', 'd']);
    });

    it('is a no-op in none mode', () => {
      const { selection, model } = setup({
        selectionMode: signal('none'),
        selectionBehavior: signal('replace'),
      });
      model.select('a');
      expect(selection()).toEqual([]);
    });
  });

  describe('selectAllState', () => {
    it('is none when nothing is selected', () => {
      const { model } = setup();
      expect(model.selectAllState()).toBe('none');
    });

    it('is some when a subset is selected', () => {
      const { model } = setup();
      model.toggle('a');
      expect(model.selectAllState()).toBe('some');
    });

    it('is all when every aggregate value is selected', () => {
      const { selection, model } = setup();
      selection.set(['a', 'b', 'c', 'd']);
      expect(model.selectAllState()).toBe('all');
    });

    it('is none when there are no selectable values', () => {
      const { model } = setup({ aggregateValues: signal([]) });
      expect(model.selectAllState()).toBe('none');
    });
  });

  describe('toggleSelectAll', () => {
    it('selects every aggregate value when not all are selected', () => {
      const { selection, model } = setup();
      model.toggleSelectAll();
      expect(selection()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('clears the selection when every aggregate value is already selected', () => {
      const { selection, model } = setup();
      selection.set(['a', 'b', 'c', 'd']);
      model.toggleSelectAll();
      expect(selection()).toEqual([]);
    });

    it('is a no-op outside multiple mode', () => {
      const { selection, model } = setup({ selectionMode: signal('single') });
      model.toggleSelectAll();
      expect(selection()).toEqual([]);
    });

    it('spans aggregate values beyond the rendered window', () => {
      const { selection, model } = setup({ aggregateValues: signal(['a', 'b', 'x', 'y', 'z']) });
      model.toggleSelectAll();
      expect(selection()).toEqual(['a', 'b', 'x', 'y', 'z']);
    });
  });

  describe('isSelected', () => {
    it('reports current membership', () => {
      const { model } = setup();
      model.toggle('a');
      expect(model.isSelected('a')).toBe(true);
      expect(model.isSelected('b')).toBe(false);
    });
  });
});
