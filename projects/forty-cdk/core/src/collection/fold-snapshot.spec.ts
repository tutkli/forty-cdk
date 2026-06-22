import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { foldSnapshotOnTotalCountTransition } from './fold-snapshot';

interface Harness {
  readonly snapshot: WritableSignal<readonly string[]>;
  readonly setItems: (items: readonly string[]) => void;
  readonly setTotal: (total: number | undefined) => void;
}

function createFold(initial: { total?: number | undefined } = {}): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const items = signal<readonly string[]>([]);
  const total = signal<number | undefined>(initial.total);
  const snapshot = TestBed.runInInjectionContext(() =>
    foldSnapshotOnTotalCountTransition<string, readonly string[]>(
      items,
      total,
      () => [],
      (prev, window) => (window.length === 0 ? prev : [...new Set([...prev, ...window])]),
    ),
  );
  return {
    snapshot,
    setItems: (next) => items.set(next),
    setTotal: (next) => total.set(next),
  };
}

describe('foldSnapshotOnTotalCountTransition', () => {
  it('folds the current window into the accumulator', () => {
    const h = createFold();
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);
  });

  it('persists the accumulator across an empty window (close → reopen)', () => {
    const h = createFold();
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);
    h.setItems([]);
    expect(h.snapshot()).toEqual(['a', 'b']);
    h.setItems(['c']);
    expect(h.snapshot()).toEqual(['a', 'b', 'c']);
  });

  it('resets to empty on a totalCount transition, deferring the fold to the next run', () => {
    const h = createFold({ total: 10 });
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);

    // The total flips while items() still holds the stale window: the fold
    // restarts from empty() and does NOT fold the stale window this run.
    h.setTotal(20);
    expect(h.snapshot()).toEqual([]);

    // Once items catches up the fresh window folds into the clean accumulator.
    h.setItems(['c', 'd']);
    expect(h.snapshot()).toEqual(['c', 'd']);
  });
});
