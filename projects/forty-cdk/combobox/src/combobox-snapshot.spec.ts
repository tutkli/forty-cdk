import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup } from '../../src/test-utils';
import type { ForComboboxOptionHandle } from './combobox-context';
import { OptionLabelCache, type SnapshotEntry } from './combobox-label-cache';
import { type IndexedSnapshotEntry, VirtualizedNavigator } from './combobox-virtualized-navigator';

interface FakeOption {
  readonly handle: ForComboboxOptionHandle<string>;
  setDisabled(v: boolean): void;
}

/**
 * Build a `ForComboboxOptionHandle` backed by writable signals so tests can
 * mutate per-handle state (disabled, label) without re-creating the whole
 * collection. The host element is a fresh `<div>` so `scrollIntoView` exists
 * (jsdom no-op) and pointer-equality checks behave like in production.
 */
function makeHandle(opts: {
  id: string;
  value: string;
  label: string;
  posInSet?: number | null;
  disabled?: boolean;
}): FakeOption {
  const id = signal(opts.id);
  const value = signal(opts.value);
  const label = signal(opts.label);
  const posInSet = signal<number | null>(opts.posInSet ?? null);
  const disabled = signal(opts.disabled ?? false);
  const host = document.createElement('div');
  return {
    handle: {
      id,
      value,
      label,
      disabled,
      posInSet,
      host,
    },
    setDisabled: (v) => disabled.set(v),
  };
}

/**
 * Replicates the host's `cachedOptions()` merge: the live label cache, plus
 * any off-window entries from the navigator's position-map (sorted by absolute
 * position, live entries winning by id).
 */
function mergedCachedOptions(
  live: readonly SnapshotEntry<string>[],
  indexed: ReadonlyMap<number, IndexedSnapshotEntry<string>>,
): readonly SnapshotEntry<string>[] {
  if (indexed.size === 0) {
    return live;
  }
  const seen = new Set(live.map((o) => o.id));
  const merged: SnapshotEntry<string>[] = [...live];
  for (const pos of [...indexed.keys()].sort((a, b) => a - b)) {
    const entry = indexed.get(pos)!;
    if (seen.has(entry.id)) continue;
    merged.push({ id: entry.id, value: entry.value, label: entry.label });
  }
  return merged;
}

interface LabelCacheHarness {
  readonly cache: OptionLabelCache<string>;
  readonly setItems: (items: readonly ForComboboxOptionHandle<string>[]) => void;
  readonly setTotal: (n: number | undefined) => void;
  readonly entries: () => readonly SnapshotEntry<string>[];
}

function createLabelCache(initialTotal?: number): LabelCacheHarness {
  const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
  const total = signal<number | undefined>(initialTotal);
  const cache = new OptionLabelCache<string>({ items, totalCount: total });
  return {
    cache,
    setItems: (next) => items.set(next),
    setTotal: (n) => total.set(n),
    entries: () => cache.entries(),
  };
}

interface NavigatorHarness {
  readonly navigator: VirtualizedNavigator<string>;
  readonly setItems: (items: readonly ForComboboxOptionHandle<string>[]) => void;
  readonly setTotal: (n: number | undefined) => void;
  readonly setRange: (r: readonly [number, number] | undefined) => void;
  readonly setActive: (id: string | null) => void;
  readonly getActive: () => string | null;
  readonly emitted: readonly number[];
  readonly resetEmitted: () => void;
}

function createNavigator(
  initial: {
    total?: number;
    range?: readonly [number, number] | undefined;
    loop?: boolean;
  } = {},
): NavigatorHarness {
  const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
  const total = signal<number | undefined>(initial.total ?? 100);
  const range = signal<readonly [number, number] | undefined>(initial.range);
  const loop = signal(initial.loop ?? true);
  const active = signal<string | null>(null);
  const emitted: number[] = [];

  const navigator = new VirtualizedNavigator<string>({
    items,
    totalCount: total,
    visibleRange: range,
    loop,
    getActiveId: () => active(),
    setActiveId: (id) => active.set(id),
    emitScrollToIndex: (idx) => {
      emitted.push(idx);
    },
    scrollActiveIntoView: () => undefined,
  });

  return {
    navigator,
    setItems: (next) => items.set(next),
    setTotal: (n) => total.set(n),
    setRange: (r) => range.set(r),
    setActive: (id) => active.set(id),
    getActive: () => active(),
    emitted,
    resetEmitted: () => {
      emitted.length = 0;
    },
  };
}

describe('OptionLabelCache', () => {
  afterEachOverlayCleanup();

  it('starts empty', () => {
    const h = createLabelCache();
    expect(h.entries()).toEqual([]);
  });

  it('captures registered options on prime', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a.handle, b.handle]);
    h.cache.prime();
    const cache = h.entries();
    expect(cache.map((e) => e.id)).toEqual(['a', 'b']);
    expect(cache.map((e) => e.label)).toEqual(['Apple', 'Banana']);
  });

  it('carries entries across an unmount (close → reopen)', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a.handle, b.handle]);
    h.cache.prime();
    // Listbox closes → consumer's @if unmounts the @for; items() goes to [].
    h.setItems([]);
    expect(h.entries().map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('resets when totalCount transitions', () => {
    const h = createLabelCache(100);
    const a = makeHandle({ id: 'r-50', value: 'fifty', label: 'Row 50', posInSet: 50 });
    h.setItems([a.handle]);
    h.cache.prime();
    expect(h.entries().some((e) => e.label === 'Row 50')).toBe(true);

    // Consumer rebuilds the source array (e.g. query change) → totalCount flips.
    h.setTotal(20);
    h.cache.prime();
    // Old entries are gone — the cache resets on totalCount transition.
    expect(h.entries().some((e) => e.label === 'Row 50')).toBe(false);
  });
});

describe('VirtualizedNavigator', () => {
  afterEachOverlayCleanup();

  describe('snapshotByPos and merged label resolution', () => {
    it('keys entries by posInSet', () => {
      const h = createNavigator();
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-1', value: 'b', label: 'Row 1', posInSet: 1 });
      h.setItems([a.handle, b.handle]);
      h.navigator.prime();
      const indexed = h.navigator.snapshotByPos();
      expect(indexed.get(0)?.label).toBe('Row 0');
      expect(indexed.get(1)?.label).toBe('Row 1');
    });

    it('merges off-window entries when resolving labels (host merge replicated)', () => {
      const label = createLabelCache(100);
      const nav = createNavigator({ range: [0, 2] });
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-1', value: 'b', label: 'Row 1', posInSet: 1 });
      label.setItems([a.handle, b.handle]);
      nav.setItems([a.handle, b.handle]);
      label.cache.prime();
      nav.navigator.prime();

      // Scroll to a different window — previously-rendered options unmount but
      // the indexed snapshot remembers them.
      const c = makeHandle({ id: 'r-50', value: 'c', label: 'Row 50', posInSet: 50 });
      label.setItems([c.handle]);
      label.setTotal(100);
      nav.setItems([c.handle]);
      nav.setRange([50, 51]);
      label.cache.prime();
      nav.navigator.prime();

      const merged = mergedCachedOptions(label.entries(), nav.navigator.snapshotByPos());
      const labels = merged.map((e) => e.label);
      expect(labels).toContain('Row 50');
      expect(labels).toContain('Row 0');
      expect(labels).toContain('Row 1');
    });
  });

  describe('navigate + pending resolution', () => {
    it('emits scrollToIndex when target is outside the visible range', () => {
      const h = createNavigator({ range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();

      // Active at posInSet 0; navigate to last (99) — out of [0, 10).
      h.setActive('r-0');
      h.navigator.navigate('last');
      expect(h.emitted).toContain(99);
      // Pending — activedescendant unchanged until the option mounts.
      expect(h.getActive()).toBe('r-0');
    });

    it('resolves pending once the target option mounts', () => {
      const h = createNavigator({ range: [0, 10] });
      const initial = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(initial.map((it) => it.handle));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');

      // Consumer reacts to scrollToIndex and mounts the windowed slice [90, 100).
      const windowed = Array.from({ length: 10 }, (_, i) => {
        const pos = 90 + i;
        return makeHandle({
          id: `r-${pos}`,
          value: `v${pos}`,
          label: `Row ${pos}`,
          posInSet: pos,
        });
      });
      h.setItems(windowed.map((it) => it.handle));
      h.setRange([90, 100]);
      // Bridge effect normally calls this; in isolation we drive it directly.
      const resolved = h.navigator.tryResolvePending();
      expect(resolved).toBe(true);
      expect(h.getActive()).toBe('r-99');
    });

    it('keeps in-window targets local without emitting scrollToIndex', () => {
      const h = createNavigator({ range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();
      h.setActive('r-0');

      h.navigator.navigate('next');
      expect(h.emitted).toEqual([]);
      expect(h.getActive()).toBe('r-1');
    });

    it('skips disabled positions known via the indexed snapshot', () => {
      const h = createNavigator({ total: 5, range: [0, 5] });
      const items = [
        makeHandle({ id: 'r-0', value: 'a', label: 'a', posInSet: 0 }),
        makeHandle({ id: 'r-1', value: 'b', label: 'b', posInSet: 1, disabled: true }),
        makeHandle({ id: 'r-2', value: 'c', label: 'c', posInSet: 2 }),
        makeHandle({ id: 'r-3', value: 'd', label: 'd', posInSet: 3 }),
        makeHandle({ id: 'r-4', value: 'e', label: 'e', posInSet: 4 }),
      ];
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();
      h.setActive('r-0');

      h.navigator.navigate('next');
      // 0 → next enabled is 2 (1 is disabled).
      expect(h.getActive()).toBe('r-2');
    });

    it('seedFromIndexedSnapshot picks the first enabled position', () => {
      const h = createNavigator({ range: [0, 5] });
      const items = [
        makeHandle({ id: 'r-0', value: 'a', label: 'a', posInSet: 0, disabled: true }),
        makeHandle({ id: 'r-1', value: 'b', label: 'b', posInSet: 1 }),
        makeHandle({ id: 'r-2', value: 'c', label: 'c', posInSet: 2 }),
      ];
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();

      h.navigator.seedFromIndexedSnapshot('first');
      expect(h.getActive()).toBe('r-1');
    });

    it('never scrolls the window when re-seeding after the active option scrolls out of view', () => {
      const h = createNavigator({ total: 1000, range: [0, 14] });
      // Initial window includes index 0, so it lands in the indexed snapshot.
      const initial = Array.from({ length: 14 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(initial.map((it) => it.handle));
      h.navigator.prime();
      h.navigator.seedFromIndexedSnapshot('first');
      expect(h.getActive()).toBe('r-0');

      // User scrolls down: the window advances and index 0 unmounts. The host
      // clears the activedescendant (mirrored here) and auto-highlight re-seeds.
      const scrolled = Array.from({ length: 14 }, (_, i) =>
        makeHandle({
          id: `r-${30 + i}`,
          value: `v${30 + i}`,
          label: `Row ${30 + i}`,
          posInSet: 30 + i,
        }),
      );
      h.setItems(scrolled.map((it) => it.handle));
      h.setRange([30, 44]);
      h.navigator.prime();
      h.setActive(null);
      h.resetEmitted();

      h.navigator.seedFromIndexedSnapshot('first');

      // Seeds the topmost *rendered* row, not absolute index 0, and requests
      // no scroll — emitting scrollToIndex(0) here is what snapped a
      // virtualized listbox back to the top on every wheel tick.
      expect(h.getActive()).toBe('r-30');
      expect(h.emitted).toEqual([]);
    });
  });

  describe('resetPending', () => {
    it('drops a pending request so it does not seed after reopen', () => {
      const h = createNavigator({ range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();
      h.setActive('r-0');
      h.navigator.navigate('last');
      expect(h.emitted).toContain(99);

      h.navigator.resetPending();

      // Even if r-99 mounts, no resolution happens.
      const target = makeHandle({
        id: 'r-99',
        value: 'v99',
        label: 'Row 99',
        posInSet: 99,
      });
      h.setItems([target.handle]);
      h.setRange([99, 100]);
      const resolved = h.navigator.tryResolvePending();
      expect(resolved).toBe(false);
      expect(h.getActive()).toBe('r-0');
    });
  });
});

describe('combobox-snapshot zoneless reactivity', () => {
  @Component({
    template: '',
  })
  class ZonelessHost {}

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('updates the label cache reactively without Zone.js', () => {
    TestBed.createComponent(ZonelessHost);

    const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
    const total = signal<number | undefined>(undefined);
    const cache = new OptionLabelCache<string>({ items, totalCount: total });

    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    items.set([a.handle]);
    cache.prime();
    expect(cache.entries().map((e) => e.id)).toEqual(['a']);

    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    items.set([a.handle, b.handle]);
    cache.prime();
    expect(cache.entries().map((e) => e.id)).toEqual(['a', 'b']);
  });
});
