import { Component, provideZonelessChangeDetection, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { ForComboboxOptionHandle } from './combobox-context';
import { ComboboxSnapshot } from './combobox-snapshot';

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

interface SnapshotHarness {
  readonly snapshot: ComboboxSnapshot<string>;
  readonly setItems: (items: readonly ForComboboxOptionHandle<string>[]) => void;
  readonly setTotal: (n: number | undefined) => void;
  readonly setRange: (r: readonly [number, number] | undefined) => void;
  readonly setActive: (id: string | null) => void;
  readonly getActive: () => string | null;
  readonly emitted: readonly number[];
  readonly resetEmitted: () => void;
  readonly items: Signal<readonly ForComboboxOptionHandle<string>[]>;
  readonly total: Signal<number | undefined>;
  readonly range: Signal<readonly [number, number] | undefined>;
}

function createHarness(
  initial: {
    total?: number | undefined;
    range?: readonly [number, number] | undefined;
    loop?: boolean;
  } = {},
): SnapshotHarness {
  const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
  const total = signal<number | undefined>(initial.total);
  const range = signal<readonly [number, number] | undefined>(initial.range);
  const loop = signal(initial.loop ?? true);
  const active = signal<string | null>(null);
  const emitted: number[] = [];

  const snapshot = new ComboboxSnapshot<string>({
    items,
    totalCount: total,
    visibleRange: range,
    loop,
    getActiveId: () => active(),
    setActiveId: (id) => active.set(id),
    emitScrollToIndex: (idx) => {
      emitted.push(idx);
    },
  });

  return {
    snapshot,
    setItems: (next) => items.set(next),
    setTotal: (n) => total.set(n),
    setRange: (r) => range.set(r),
    setActive: (id) => active.set(id),
    getActive: () => active(),
    emitted,
    resetEmitted: () => {
      emitted.length = 0;
    },
    items,
    total,
    range,
  };
}

describe('ComboboxSnapshot', () => {
  describe('cachedOptions persistence', () => {
    it('starts empty', () => {
      const h = createHarness();
      expect(h.snapshot.cachedOptions()).toEqual([]);
    });

    it('captures registered options on prime', () => {
      const h = createHarness();
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a.handle, b.handle]);
      h.snapshot.prime();
      const cache = h.snapshot.cachedOptions();
      expect(cache.map((e) => e.id)).toEqual(['a', 'b']);
      expect(cache.map((e) => e.label)).toEqual(['Apple', 'Banana']);
    });

    it('carries entries across an unmount (close → reopen)', () => {
      const h = createHarness();
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a.handle, b.handle]);
      h.snapshot.prime();
      // Listbox closes → consumer's @if unmounts the @for; items() goes to [].
      h.setItems([]);
      const stillCached = h.snapshot.cachedOptions();
      expect(stillCached.map((e) => e.id)).toEqual(['a', 'b']);
    });

    it('resets when totalCount transitions', () => {
      const h = createHarness({ total: 100 });
      const a = makeHandle({ id: 'r-50', value: 'fifty', label: 'Row 50', posInSet: 50 });
      h.setItems([a.handle]);
      h.snapshot.prime();
      expect(h.snapshot.cachedOptions().some((e) => e.label === 'Row 50')).toBe(true);

      // Consumer rebuilds the source array (e.g. query change) → totalCount flips.
      h.setTotal(20);
      h.snapshot.prime();
      // Old entries are gone — the cache resets on totalCount transition.
      expect(h.snapshot.cachedOptions().some((e) => e.label === 'Row 50')).toBe(false);
    });
  });

  describe('snapshotByPos and merged cachedOptions', () => {
    it('keys entries by posInSet under virtualization', () => {
      const h = createHarness({ total: 100 });
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-1', value: 'b', label: 'Row 1', posInSet: 1 });
      h.setItems([a.handle, b.handle]);
      h.snapshot.prime();
      const indexed = h.snapshot.snapshotByPos();
      expect(indexed.get(0)?.label).toBe('Row 0');
      expect(indexed.get(1)?.label).toBe('Row 1');
    });

    it('merges off-window entries into cachedOptions when virtualizing', () => {
      const h = createHarness({ total: 100, range: [0, 2] });
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-1', value: 'b', label: 'Row 1', posInSet: 1 });
      h.setItems([a.handle, b.handle]);
      h.snapshot.prime();

      // Scroll to a different window — previously-rendered options unmount but
      // the indexed snapshot remembers them.
      const c = makeHandle({ id: 'r-50', value: 'c', label: 'Row 50', posInSet: 50 });
      h.setItems([c.handle]);
      h.setRange([50, 51]);
      h.snapshot.prime();

      const merged = h.snapshot.cachedOptions();
      const labels = merged.map((e) => e.label);
      // Live entry first, then off-window entries by absolute position.
      expect(labels).toContain('Row 50');
      expect(labels).toContain('Row 0');
      expect(labels).toContain('Row 1');
    });

    it('skips merging for non-virtualized lists (no totalCount)', () => {
      const h = createHarness();
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      h.setItems([a.handle]);
      h.snapshot.prime();
      // No totalCount → cachedOptions returns the live cache untouched.
      expect(h.snapshot.cachedOptions().map((e) => e.id)).toEqual(['a']);
    });
  });

  describe('navigateVirtualized + pending resolution', () => {
    it('emits scrollToIndex when target is outside the visible range', () => {
      const h = createHarness({ total: 100, range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.snapshot.prime();

      // Active at posInSet 0; navigate to last (99) — out of [0, 10).
      h.setActive('r-0');
      h.snapshot.navigateVirtualized('last');
      expect(h.emitted).toContain(99);
      // Pending — activedescendant unchanged until the option mounts.
      expect(h.getActive()).toBe('r-0');
    });

    it('resolves pending once the target option mounts', () => {
      const h = createHarness({ total: 100, range: [0, 10] });
      const initial = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(initial.map((it) => it.handle));
      h.snapshot.prime();
      h.setActive('r-0');
      h.snapshot.navigateVirtualized('last');

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
      const resolved = h.snapshot.tryResolvePending();
      expect(resolved).toBe(true);
      expect(h.getActive()).toBe('r-99');
    });

    it('keeps in-window targets local without emitting scrollToIndex', () => {
      const h = createHarness({ total: 100, range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.snapshot.prime();
      h.setActive('r-0');

      h.snapshot.navigateVirtualized('next');
      expect(h.emitted).toEqual([]);
      expect(h.getActive()).toBe('r-1');
    });

    it('skips disabled positions known via the indexed snapshot', () => {
      const h = createHarness({ total: 5, range: [0, 5] });
      const items = [
        makeHandle({ id: 'r-0', value: 'a', label: 'a', posInSet: 0 }),
        makeHandle({ id: 'r-1', value: 'b', label: 'b', posInSet: 1, disabled: true }),
        makeHandle({ id: 'r-2', value: 'c', label: 'c', posInSet: 2 }),
        makeHandle({ id: 'r-3', value: 'd', label: 'd', posInSet: 3 }),
        makeHandle({ id: 'r-4', value: 'e', label: 'e', posInSet: 4 }),
      ];
      h.setItems(items.map((it) => it.handle));
      h.snapshot.prime();
      h.setActive('r-0');

      h.snapshot.navigateVirtualized('next');
      // 0 → next enabled is 2 (1 is disabled).
      expect(h.getActive()).toBe('r-2');
    });

    it('seedFromIndexedSnapshot picks the first enabled position', () => {
      const h = createHarness({ total: 100, range: [0, 5] });
      const items = [
        makeHandle({ id: 'r-0', value: 'a', label: 'a', posInSet: 0, disabled: true }),
        makeHandle({ id: 'r-1', value: 'b', label: 'b', posInSet: 1 }),
        makeHandle({ id: 'r-2', value: 'c', label: 'c', posInSet: 2 }),
      ];
      h.setItems(items.map((it) => it.handle));
      h.snapshot.prime();

      h.snapshot.seedFromIndexedSnapshot('first');
      expect(h.getActive()).toBe('r-1');
    });
  });

  describe('resetPending', () => {
    it('drops a pending request so it does not seed after reopen', () => {
      const h = createHarness({ total: 100, range: [0, 10] });
      const items = Array.from({ length: 10 }, (_, i) =>
        makeHandle({ id: `r-${i}`, value: `v${i}`, label: `Row ${i}`, posInSet: i }),
      );
      h.setItems(items.map((it) => it.handle));
      h.snapshot.prime();
      h.setActive('r-0');
      h.snapshot.navigateVirtualized('last');
      expect(h.emitted).toContain(99);

      h.snapshot.resetPending();

      // Even if r-99 mounts, no resolution happens.
      const target = makeHandle({
        id: 'r-99',
        value: 'v99',
        label: 'Row 99',
        posInSet: 99,
      });
      h.setItems([target.handle]);
      h.setRange([99, 100]);
      const resolved = h.snapshot.tryResolvePending();
      expect(resolved).toBe(false);
      expect(h.getActive()).toBe('r-0');
    });
  });

  describe('zoneless reactivity', () => {
    @Component({
      template: '',
    })
    class ZonelessHost {}

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    });

    it('updates cachedOptions reactively without Zone.js', () => {
      TestBed.createComponent(ZonelessHost);

      const h = createHarness();
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      h.setItems([a.handle]);
      h.snapshot.prime();
      expect(h.snapshot.cachedOptions().map((e) => e.id)).toEqual(['a']);

      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a.handle, b.handle]);
      h.snapshot.prime();
      expect(h.snapshot.cachedOptions().map((e) => e.id)).toEqual(['a', 'b']);
    });
  });
});
