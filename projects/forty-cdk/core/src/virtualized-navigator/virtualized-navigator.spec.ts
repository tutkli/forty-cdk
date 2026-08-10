import { ApplicationRef, effect, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { isUnset, unsetInput } from '../unset-input/unset-input';
import { VirtualizedNavigator } from './virtualized-navigator';

interface FakeHandle {
  readonly id: () => string;
  readonly pos: () => number | null;
  readonly disabled: () => boolean;
  readonly value: () => string;
  readonly host: HTMLElement;
}

interface FakeEntry {
  readonly id: string;
  readonly disabled: boolean;
  readonly value: string;
}

function makeHandle(opts: {
  id: string;
  value?: string;
  pos?: number | null;
  disabled?: boolean;
}): FakeHandle {
  const id = signal(opts.id);
  const value = signal(opts.value ?? opts.id);
  const pos = signal<number | null>(opts.pos ?? null);
  const disabled = signal(opts.disabled ?? false);
  const host = document.createElement('div');
  return { id, pos, disabled, value, host };
}

interface Harness {
  readonly navigator: VirtualizedNavigator<FakeHandle, FakeEntry>;
  readonly setItems: (items: readonly FakeHandle[]) => void;
  readonly setTotal: (n: number | undefined) => void;
  readonly setRange: (r: readonly [number, number] | undefined) => void;
  readonly setActive: (id: string | null) => void;
  readonly getActive: () => string | null;
  readonly bumpDataVersion: () => void;
  readonly emitted: readonly number[];
  readonly resetEmitted: () => void;
}

function createNavigator(
  initial: {
    total?: number;
    range?: readonly [number, number] | undefined;
    loop?: boolean;
    scrollIntoView?: (host: HTMLElement) => void;
    deferFold?: boolean;
    withDataVersion?: boolean;
  } = {},
): Harness {
  const items = signal<readonly FakeHandle[]>([]);
  const total = signal<number | undefined>(initial.total ?? 100);
  const range = signal<readonly [number, number] | undefined>(initial.range);
  const loop = signal(initial.loop ?? true);
  const active = signal<string | null>(null);
  const dataVersion = signal(0);
  const emitted: number[] = [];

  const navigator = new VirtualizedNavigator<FakeHandle, FakeEntry>(
    {
      items,
      totalCount: total,
      visibleRange: range,
      loop: () => loop(),
      getActiveId: () => active(),
      setActiveId: (id) => active.set(id),
      emitScrollToIndex: (idx) => {
        emitted.push(idx);
      },
      dataVersion: initial.withDataVersion ? dataVersion : undefined,
    },
    {
      posOf: (h) => h.pos(),
      idOf: (h) => h.id(),
      hostOf: (h) => h.host,
      isDisabled: (h) => h.disabled(),
      readEntry: (h) => {
        const id = h.id();
        const value = h.value();
        return isUnset(value) ? null : { id, value, disabled: h.disabled() };
      },
      scrollIntoView: initial.scrollIntoView,
    },
    { deferFoldOnTotalTransition: initial.deferFold ?? false },
  );

  return {
    navigator,
    setItems: (next) => items.set(next),
    setTotal: (n) => total.set(n),
    setRange: (r) => range.set(r),
    setActive: (id) => active.set(id),
    getActive: () => active(),
    bumpDataVersion: () => dataVersion.update((v) => v + 1),
    emitted,
    resetEmitted: () => {
      emitted.length = 0;
    },
  };
}

describe('VirtualizedNavigator', () => {
  describe('snapshotByPos', () => {
    it('keys entries by absolute position', () => {
      const h = createNavigator();
      h.setItems([makeHandle({ id: 'r-0', pos: 0 }), makeHandle({ id: 'r-1', pos: 1 })]);
      h.navigator.prime();
      const indexed = h.navigator.snapshotByPos();
      expect(indexed.get(0)?.id).toBe('r-0');
      expect(indexed.get(1)?.id).toBe('r-1');
    });

    it('carries entries across an unmount (close → reopen) while total is stable', () => {
      const h = createNavigator({ total: 100 });
      h.setItems([makeHandle({ id: 'r-0', pos: 0 }), makeHandle({ id: 'r-1', pos: 1 })]);
      h.navigator.prime();
      h.setItems([]);
      h.navigator.prime();
      const indexed = h.navigator.snapshotByPos();
      expect(indexed.get(0)?.id).toBe('r-0');
      expect(indexed.get(1)?.id).toBe('r-1');
    });

    it('drops carried-over entries when totalCount transitions (fold mode folds the fresh window)', () => {
      const h = createNavigator({ total: 100 });
      h.setItems([makeHandle({ id: 'r-50', pos: 50 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(50)?.id).toBe('r-50');

      h.setTotal(20);
      h.setItems([makeHandle({ id: 'r-10', pos: 10 })]);
      h.navigator.prime();
      const snap = h.navigator.snapshotByPos();
      expect(snap.has(50)).toBe(false);
      expect(snap.get(10)?.id).toBe('r-10');
    });

    it('defers folding the stale window on a totalCount transition (defer mode)', () => {
      const h = createNavigator({ total: 100, deferFold: true });
      h.setItems([makeHandle({ id: 'r-50', pos: 50 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(50)?.id).toBe('r-50');

      // total flips while items() still holds the previous window — the snapshot
      // empties without folding the stale entries.
      h.setTotal(20);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().size).toBe(0);

      // items catch up → the fresh window folds into a clean accumulator.
      h.setItems([makeHandle({ id: 'r-10', pos: 10 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(10)?.id).toBe('r-10');
      expect(h.navigator.snapshotByPos().has(50)).toBe(false);
    });

    it('purges carried-over off-window entries on invalidateSnapshot() (no totalCount transition)', () => {
      const h = createNavigator({ total: 1000 });
      h.setItems([makeHandle({ id: 'a-0', pos: 0 }), makeHandle({ id: 'a-500', pos: 500 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.id).toBe('a-500');

      h.setItems([makeHandle({ id: 'b-0', pos: 0 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.id).toBe('a-500');

      h.navigator.invalidateSnapshot();
      h.navigator.prime();
      const snap = h.navigator.snapshotByPos();
      expect(snap.has(500)).toBe(false);
      expect(snap.get(0)?.id).toBe('b-0');
    });

    it('serves fresh entries for previously-stale positions after invalidateSnapshot()', () => {
      const h = createNavigator({ total: 1000 });
      h.setItems([makeHandle({ id: 'a-500', pos: 500, disabled: false, value: 'old' })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.value).toBe('old');

      h.navigator.invalidateSnapshot();
      h.setItems([makeHandle({ id: 'z-500', pos: 500, disabled: true, value: 'new' })]);
      h.navigator.prime();
      const entry = h.navigator.snapshotByPos().get(500);
      expect(entry?.id).toBe('z-500');
      expect(entry?.value).toBe('new');
      expect(entry?.disabled).toBe(true);
    });

    it('purges carried-over off-window entries when the consumer dataVersion bumps', () => {
      const h = createNavigator({ total: 1000, withDataVersion: true });
      h.setItems([makeHandle({ id: 'a-0', pos: 0 }), makeHandle({ id: 'a-500', pos: 500 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.id).toBe('a-500');

      h.bumpDataVersion();
      h.setItems([makeHandle({ id: 'b-0', pos: 0 })]);
      h.navigator.prime();
      const snap = h.navigator.snapshotByPos();
      expect(snap.has(500)).toBe(false);
      expect(snap.get(0)?.id).toBe('b-0');
    });

    it('skips an option whose value binding is unwritten, folding it in on the re-run', () => {
      const h = createNavigator();
      const bound = signal<string | null>(null);
      const id = signal('r-0');
      const pos = signal<number | null>(0);
      const disabled = signal(false);
      const host = document.createElement('div');
      const handle: FakeHandle = {
        id,
        pos,
        disabled,
        value: () => bound() ?? unsetInput<string>(),
        host,
      };
      h.setItems([handle]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().has(0)).toBe(false);

      bound.set('apple');
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(0)?.value).toBe('apple');
    });
  });

  describe('navigate + pending resolution', () => {
    it('keeps in-window targets local without emitting scrollToIndex', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');

      h.navigator.navigate('next');
      expect(h.emitted).toEqual([]);
      expect(h.getActive()).toBe('r-1');
    });

    it('emits scrollToIndex and stays pending when the target is outside the window', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');

      h.navigator.navigate('last');
      expect(h.emitted).toContain(99);
      expect(h.getActive()).toBe('r-0');
    });

    it('resolves pending once the target option mounts', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');

      h.setItems(
        Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${90 + i}`, pos: 90 + i })),
      );
      h.setRange([90, 100]);
      const resolved = h.navigator.tryResolvePending();
      expect(resolved).toBe(true);
      expect(h.getActive()).toBe('r-99');
    });

    it('continues in the pending direction when the resolved item is disabled (prev)', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');
      expect(h.emitted).toContain(99);

      h.setItems([
        ...Array.from({ length: 9 }, (_, i) => makeHandle({ id: `r-${90 + i}`, pos: 90 + i })),
        makeHandle({ id: 'r-99', pos: 99, disabled: true }),
      ]);
      h.setRange([90, 100]);
      h.navigator.prime();
      const resolved = h.navigator.tryResolvePending();
      expect(resolved).toBe(true);
      expect(h.getActive()).toBe('r-98');
    });

    it('continues in the pending direction when the resolved item is disabled (next)', () => {
      const h = createNavigator({ total: 100, range: [0, 10] });
      h.setItems([makeHandle({ id: 'r-50', pos: 50 })]);
      h.setRange([50, 51]);
      h.navigator.prime();
      h.setActive('r-50');

      h.navigator.navigate('next');
      expect(h.emitted).toContain(51);

      h.setItems([
        makeHandle({ id: 'r-51', pos: 51, disabled: true }),
        makeHandle({ id: 'r-52', pos: 52 }),
      ]);
      h.setRange([51, 53]);
      h.navigator.prime();
      const resolved = h.navigator.tryResolvePending();
      expect(resolved).toBe(true);
      expect(h.getActive()).toBe('r-52');
    });

    it('never settles activedescendant on a disabled entry id via pending resolution', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');

      h.setItems([
        ...Array.from({ length: 9 }, (_, i) => makeHandle({ id: `r-${90 + i}`, pos: 90 + i })),
        makeHandle({ id: 'r-99', pos: 99, disabled: true }),
      ]);
      h.setRange([90, 100]);
      h.navigator.tryResolvePending();
      expect(h.getActive()).not.toBe('r-99');
    });

    it('skips disabled positions known via the indexed snapshot', () => {
      const h = createNavigator({ total: 5, range: [0, 5] });
      h.setItems([
        makeHandle({ id: 'r-0', pos: 0 }),
        makeHandle({ id: 'r-1', pos: 1, disabled: true }),
        makeHandle({ id: 'r-2', pos: 2 }),
        makeHandle({ id: 'r-3', pos: 3 }),
        makeHandle({ id: 'r-4', pos: 4 }),
      ]);
      h.navigator.prime();
      h.setActive('r-0');

      h.navigator.navigate('next');
      expect(h.getActive()).toBe('r-2');
    });

    it('starts from first / last when there is no active position', () => {
      const h = createNavigator({ total: 5, range: [0, 5] });
      h.setItems(Array.from({ length: 5 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();

      h.navigator.navigate('next');
      expect(h.getActive()).toBe('r-0');

      h.setActive(null);
      h.navigator.navigate('prev');
      expect(h.getActive()).toBe('r-4');
    });
  });

  describe('seedActive', () => {
    it('seeds directly when the index is rendered', () => {
      const h = createNavigator({ range: [0, 5] });
      h.setItems(Array.from({ length: 5 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();

      h.navigator.seedActive(3);
      expect(h.getActive()).toBe('r-3');
      expect(h.emitted).toEqual([]);
    });

    it('emits scrollToIndex and stays pending when the index is off-window', () => {
      const h = createNavigator({ range: [0, 5] });
      h.setItems(Array.from({ length: 5 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();

      h.navigator.seedActive(50);
      expect(h.emitted).toContain(50);
      expect(h.getActive()).toBeNull();

      h.setItems([makeHandle({ id: 'r-50', pos: 50 })]);
      h.setRange([50, 51]);
      expect(h.navigator.tryResolvePending()).toBe(true);
      expect(h.getActive()).toBe('r-50');
    });
  });

  describe('seedFirstRenderedEnabled', () => {
    it('seeds the first enabled rendered handle, ordered by absolute position', () => {
      const h = createNavigator({ range: [0, 5] });
      h.setItems([
        makeHandle({ id: 'r-2', pos: 2 }),
        makeHandle({ id: 'r-0', pos: 0, disabled: true }),
        makeHandle({ id: 'r-1', pos: 1 }),
      ]);
      h.navigator.prime();

      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBe('r-1');
    });

    it('seeds the last enabled rendered handle for a last seed', () => {
      const h = createNavigator({ range: [0, 5] });
      h.setItems([
        makeHandle({ id: 'r-0', pos: 0 }),
        makeHandle({ id: 'r-1', pos: 1 }),
        makeHandle({ id: 'r-2', pos: 2, disabled: true }),
      ]);
      h.navigator.prime();

      h.navigator.seedFirstRenderedEnabled('last');
      expect(h.getActive()).toBe('r-1');
    });

    it('seeds the topmost rendered handle without requesting a scroll', () => {
      const h = createNavigator({ total: 1000, range: [30, 44] });
      h.setItems(
        Array.from({ length: 14 }, (_, i) => makeHandle({ id: `r-${30 + i}`, pos: 30 + i })),
      );
      h.navigator.prime();

      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBe('r-30');
      expect(h.emitted).toEqual([]);
    });

    it('seeds a handle the fold skipped because its value binding is unwritten', () => {
      const h = createNavigator({ range: [0, 5] });
      const handle: FakeHandle = {
        id: signal('r-0'),
        pos: signal<number | null>(0),
        disabled: signal(false),
        value: () => unsetInput<string>(),
        host: document.createElement('div'),
      };
      h.setItems([handle]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().has(0)).toBe(false);

      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBe('r-0');
    });

    it('leaves activedescendant alone when nothing is rendered or every handle is disabled', () => {
      const h = createNavigator({ range: [0, 5] });
      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBeNull();

      h.setItems([makeHandle({ id: 'r-0', pos: 0, disabled: true })]);
      h.navigator.prime();
      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBeNull();
    });

    it('leaves activedescendant alone when totalCount is unset', () => {
      const h = createNavigator();
      h.setItems([makeHandle({ id: 'r-0', pos: 0 })]);
      h.setTotal(undefined);

      h.navigator.seedFirstRenderedEnabled('first');
      expect(h.getActive()).toBeNull();
    });
  });

  describe('resetPending', () => {
    it('drops a pending request so it does not seed after reopen', () => {
      const h = createNavigator({ range: [0, 10] });
      h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');
      expect(h.emitted).toContain(99);

      h.navigator.resetPending();

      h.setItems([makeHandle({ id: 'r-99', pos: 99 })]);
      h.setRange([99, 100]);
      expect(h.navigator.tryResolvePending()).toBe(false);
      expect(h.getActive()).toBe('r-0');
    });
  });

  describe('scrollIntoView', () => {
    it('calls the host scrollIntoView by default when an option becomes active', () => {
      const h = createNavigator({ range: [0, 5] });
      const items = Array.from({ length: 5 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i }));
      for (const it of items) {
        it.host.scrollIntoView = vi.fn();
      }
      h.setItems(items);
      h.navigator.prime();

      h.navigator.seedActive(2);
      expect(items[2]!.host.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('uses the injected scrollIntoView override instead of the host call', () => {
      const override = vi.fn();
      const h = createNavigator({ range: [0, 5], scrollIntoView: override });
      const items = Array.from({ length: 5 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i }));
      for (const it of items) {
        it.host.scrollIntoView = vi.fn();
      }
      h.setItems(items);
      h.navigator.prime();

      h.navigator.seedActive(2);
      expect(override).toHaveBeenCalledWith(items[2]!.host);
      expect(items[2]!.host.scrollIntoView).not.toHaveBeenCalled();
    });
  });
});

describe('VirtualizedNavigator snapshot reactivity', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('reflects newly-mounted options in the snapshot', () => {
    TestBed.runInInjectionContext(() => {
      const h = createNavigator({ total: 100 });
      h.setItems([makeHandle({ id: 'r-0', pos: 0 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(0)?.id).toBe('r-0');

      h.setItems([makeHandle({ id: 'r-0', pos: 0 }), makeHandle({ id: 'r-1', pos: 1 })]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(1)?.id).toBe('r-1');
    });
  });

  it('does not self-invalidate a bridge effect when resolving a pending target', () => {
    const appRef = TestBed.inject(ApplicationRef);
    const h = createNavigator({ total: 100, range: [0, 10] });
    h.setItems(Array.from({ length: 10 }, (_, i) => makeHandle({ id: `r-${i}`, pos: i })));

    let runs = 0;
    TestBed.runInInjectionContext(() => {
      effect(() => {
        h.navigator.prime();
        h.navigator.tryResolvePending();
        runs++;
      });
    });

    appRef.tick();
    expect(runs).toBe(1);

    // Seeding an off-window target (as a keydown handler does) writes only the
    // pending slot. The effect tracks items(), not the pending slot, so it must
    // not re-run.
    h.navigator.seedActive(99);
    appRef.tick();
    expect(runs).toBe(1);
    expect(h.getActive()).toBeNull();

    // The freshly-mounted window is a real items() change: the effect runs once
    // more and resolves the pending target — writing the slot back to null must
    // not trigger a further self-invalidating run.
    h.setItems([makeHandle({ id: 'r-99', pos: 99 })]);
    h.setRange([99, 100]);
    appRef.tick();
    expect(runs).toBe(2);
    expect(h.getActive()).toBe('r-99');
  });
});
