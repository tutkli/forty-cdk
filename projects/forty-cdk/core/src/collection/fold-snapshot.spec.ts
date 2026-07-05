import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { foldSnapshotOnTotalCountTransition } from './fold-snapshot';

interface Harness {
  readonly snapshot: WritableSignal<readonly string[]>;
  readonly setItems: (items: readonly string[]) => void;
  readonly setTotal: (total: number | undefined) => void;
  readonly bumpVersion: () => void;
}

function createFold(
  initial: {
    total?: number | undefined;
    deferOnTotalTransition?: boolean;
    withVersion?: boolean;
  } = {},
): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const items = signal<readonly string[]>([]);
  const total = signal<number | undefined>(initial.total);
  const dataVersion = signal(0);
  const snapshot = TestBed.runInInjectionContext(() =>
    foldSnapshotOnTotalCountTransition<string, readonly string[]>(
      items,
      total,
      () => [],
      (prev, window) => (window.length === 0 ? prev : [...new Set([...prev, ...window])]),
      {
        deferOnTotalTransition: initial.deferOnTotalTransition,
        dataVersion: initial.withVersion ? dataVersion : undefined,
      },
    ),
  );
  return {
    snapshot,
    setItems: (next) => items.set(next),
    setTotal: (next) => total.set(next),
    bumpVersion: () => dataVersion.update((v) => v + 1),
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
    const h = createFold({ total: 10, deferOnTotalTransition: true });
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

  it('folds the current window into the fresh accumulator on a totalCount transition (non-defer)', () => {
    const h = createFold({ total: 10 });
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.setTotal(20);
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.setItems(['c', 'd']);
    expect(h.snapshot()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('folds the current window on a dataVersion bump even under defer, purging carried-over entries', () => {
    const h = createFold({ total: 10, deferOnTotalTransition: true, withVersion: true });
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.setItems([]);
    expect(h.snapshot()).toEqual(['a', 'b']);
    h.setItems(['a']);
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.bumpVersion();
    expect(h.snapshot()).toEqual(['a']);
  });

  it('resets and folds the current window when the dataVersion bumps (non-defer)', () => {
    const h = createFold({ total: 10, withVersion: true });
    h.setItems(['a', 'b']);
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.bumpVersion();
    expect(h.snapshot()).toEqual(['a', 'b']);

    h.setItems(['a', 'b', 'c']);
    expect(h.snapshot()).toEqual(['a', 'b', 'c']);
  });
});
