import {
  provideZonelessChangeDetection,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LabelSnapshot, type LabelSnapshotEntry, type LabelSnapshotHandle } from './label-snapshot';

function makeHandle(opts: {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}): LabelSnapshotHandle<string> {
  return {
    id: signal(opts.id),
    value: signal(opts.value),
    label: signal(opts.label),
    disabled: signal(opts.disabled ?? false),
  };
}

interface Harness {
  readonly snapshot: LabelSnapshot<string>;
  readonly setItems: (items: readonly LabelSnapshotHandle<string>[]) => void;
  readonly setTotal: (total: number | undefined) => void;
  readonly ids: () => readonly string[];
  readonly liveIds: () => readonly string[];
}

function createSnapshot(opts: { total?: number; carryOver?: Signal<boolean> } = {}): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const items: WritableSignal<readonly LabelSnapshotHandle<string>[]> = signal([]);
  const total = signal<number | undefined>(opts.total);
  const snapshot = new LabelSnapshot<string>({
    items,
    totalCount: total,
    itemToFormValue: signal((value: string) => value),
    carryOver: opts.carryOver,
  });
  return {
    snapshot,
    setItems: (next) => items.set(next),
    setTotal: (next) => total.set(next),
    ids: () => snapshot.entries().map((e) => e.id),
    liveIds: () => snapshot.liveEntries().map((e) => e.id),
  };
}

describe('LabelSnapshot', () => {
  it('folds the live window into value-keyed entries', () => {
    const h = createSnapshot();
    h.setItems([
      makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
      makeHandle({ id: 'b', value: 'banana', label: 'Banana', disabled: true }),
    ]);
    expect(h.snapshot.entries()).toEqual([
      { id: 'a', value: 'apple', label: 'Apple', disabled: false },
      { id: 'b', value: 'banana', label: 'Banana', disabled: true },
    ]);
  });

  it('persists the accumulator across an empty window (close → re-open)', () => {
    const h = createSnapshot();
    h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
    h.snapshot.prime();
    h.setItems([]);
    expect(h.ids()).toEqual(['a']);
    h.setItems([makeHandle({ id: 'b', value: 'banana', label: 'Banana' })]);
    expect(h.ids()).toEqual(['a', 'b']);
  });

  it('re-keys an entry whose label changed under the same value', () => {
    const h = createSnapshot();
    h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
    h.snapshot.prime();
    h.setItems([makeHandle({ id: 'a2', value: 'apple', label: 'Apple pie' })]);
    expect(h.snapshot.entries()).toEqual([
      { id: 'a2', value: 'apple', label: 'Apple pie', disabled: false },
    ]);
  });

  it('drops an option removed from the source out of liveEntries only', () => {
    const h = createSnapshot();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a, b]);
    h.snapshot.prime();
    h.setItems([a]);
    expect(h.ids()).toEqual(['a', 'b']);
    expect(h.liveIds()).toEqual(['a']);
  });

  it('restarts the accumulator on a totalCount transition without folding the stale window', () => {
    const h = createSnapshot({ total: 100 });
    h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
    h.snapshot.prime();
    expect(h.ids()).toEqual(['a']);

    h.setTotal(50);
    expect(h.ids()).toEqual([]);

    h.setItems([makeHandle({ id: 'z', value: 'zucchini', label: 'Zucchini' })]);
    expect(h.ids()).toEqual(['z']);
  });

  it('skips a handle whose required input is not written yet, folding it in on the re-run', () => {
    const h = createSnapshot();
    const value = signal<string | null>(null);
    const pending: LabelSnapshotHandle<string> = {
      id: signal('p'),
      label: signal('Pending'),
      disabled: signal(false),
      value: (() => {
        const read = value();
        if (read === null) {
          const error = new Error('NG0950') as Error & { code?: number };
          error.code = -950;
          throw error;
        }
        return read;
      }) as unknown as Signal<string>,
    };
    h.setItems([pending]);
    expect(h.ids()).toEqual([]);

    value.set('pear');
    expect(h.snapshot.entries()).toEqual([
      { id: 'p', value: 'pear', label: 'Pending', disabled: false },
    ]);
  });

  it('propagates a non-NG0950 throw out of the fold', () => {
    const h = createSnapshot();
    const broken: LabelSnapshotHandle<string> = {
      id: signal('x'),
      label: signal('X'),
      disabled: signal(false),
      value: (() => {
        throw new Error('boom');
      }) as unknown as Signal<string>,
    };
    h.setItems([broken]);
    expect(() => h.snapshot.entries()).toThrow('boom');
  });

  describe('carryOver', () => {
    it('rebuilds from the live window when carryOver is false', () => {
      const carryOver = signal(false);
      const h = createSnapshot({ carryOver });
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a, b]);
      h.snapshot.prime();
      h.setItems([a]);
      expect(h.ids()).toEqual(['a']);
    });

    it('still persists across an empty window when carryOver is false', () => {
      const h = createSnapshot({ carryOver: signal(false) });
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      h.snapshot.prime();
      h.setItems([]);
      expect(h.ids()).toEqual(['a']);
    });

    it('follows the signal when carryOver flips', () => {
      const carryOver = signal(false);
      const h = createSnapshot({ carryOver });
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a, b]);
      h.snapshot.prime();

      carryOver.set(true);
      h.setItems([a]);
      expect(h.ids()).toEqual(['a', 'b']);
    });
  });

  describe('mergedEntries', () => {
    it('returns the accumulated entries unchanged for an empty position map', () => {
      const h = createSnapshot();
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      expect(h.snapshot.mergedEntries(new Map())).toEqual(h.snapshot.entries());
    });

    it('appends off-window entries sorted by absolute position, live ones winning', () => {
      const h = createSnapshot({ total: 100 });
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      h.snapshot.prime();
      const indexed = new Map<number, LabelSnapshotEntry<string>>([
        [40, { id: 'z', value: 'zucchini', label: 'Zucchini', disabled: false }],
        [10, { id: 'm', value: 'mango', label: 'Mango', disabled: true }],
        [0, { id: 'a-stale', value: 'apple', label: 'Stale apple', disabled: false }],
      ]);
      expect(h.snapshot.mergedEntries(indexed).map((e) => e.id)).toEqual(['a', 'm', 'z']);
    });
  });
});
