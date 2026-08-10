import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LabelCache, type LabelCacheEntry } from 'forty-cdk/core';

import { afterEachOverlayCleanup } from '../../src/test-utils';
import type { ForComboboxOptionHandle } from './combobox-context';
import { mergeOffWindowEntries } from './combobox-off-window-merge';
import {
  type ComboboxVirtualizedNavigator,
  createComboboxVirtualizedNavigator,
} from './combobox-virtualized-navigator';

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

const toFormValue = (value: string): string => value;

interface LabelCacheHarness {
  readonly cache: LabelCache<string>;
  readonly setItems: (items: readonly ForComboboxOptionHandle<string>[]) => void;
  readonly setValue: (value: readonly string[]) => void;
}

function createLabelCache(): LabelCacheHarness {
  const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
  const value = signal<readonly string[]>([]);
  const cache = new LabelCache<string>({
    items,
    value,
    itemToFormValue: signal(toFormValue),
  });
  return {
    cache,
    setItems: (next) => items.set(next),
    setValue: (next) => value.set(next),
  };
}

interface NavigatorHarness {
  readonly navigator: ComboboxVirtualizedNavigator<string>;
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

  const navigator = createComboboxVirtualizedNavigator<string>(
    {
      items,
      totalCount: total,
      visibleRange: range,
      loop,
      getActiveId: () => active(),
      setActiveId: (id) => active.set(id),
      emitScrollToIndex: (idx) => {
        emitted.push(idx);
      },
    },
    () => undefined,
  );

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

describe('completionEntries', () => {
  afterEachOverlayCleanup();

  it('starts empty', () => {
    const h = createLabelCache();
    expect(h.cache.windowEntries()).toEqual([]);
  });

  it('captures registered options on prime', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a.handle, b.handle]);
    h.cache.prime();
    const entries = h.cache.windowEntries();
    expect(entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(entries.map((e) => e.label)).toEqual(['Apple', 'Banana']);
  });

  it('carries the window across an unmount so completion survives close', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a.handle, b.handle]);
    h.cache.prime();
    // Listbox closes → consumer's @if unmounts the @for; items() goes to [].
    h.setItems([]);
    expect(h.cache.windowEntries().map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('purges a live-window removal so completion stops offering it (#1196)', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    h.setItems([a.handle, b.handle]);
    h.cache.prime();
    expect(h.cache.windowEntries().map((e) => e.id)).toEqual(['a', 'b']);

    h.setItems([a.handle]);
    h.cache.prime();
    expect(h.cache.windowEntries().map((e) => e.id)).toEqual(['a']);
  });

  it('keeps a selected label across a query rebuild that drops its option', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    h.setItems([a.handle]);
    h.setValue(['apple']);
    h.cache.prime();

    const fresh = makeHandle({ id: 'z', value: 'zucchini', label: 'Zucchini' });
    h.setItems([fresh.handle]);
    h.cache.prime();

    expect(h.cache.selectedEntries().map((e) => e.label)).toEqual(['Apple']);
    expect(h.cache.windowEntries().map((e) => e.id)).toEqual(['z']);
  });

  it('returns the window unchanged for an empty position map (non-virtualized)', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    h.setItems([a.handle]);
    const window = h.cache.windowEntries();
    expect(mergeOffWindowEntries(window, new Map(), toFormValue)).toBe(window);
  });

  it('overlays off-window entries sorted by absolute position', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    h.setItems([a.handle]);
    h.cache.prime();
    const offWindow = new Map<number, LabelCacheEntry<string>>([
      [40, { id: 'z', value: 'zucchini', label: 'Zucchini', disabled: false }],
      [10, { id: 'm', value: 'mango', label: 'Mango', disabled: true }],
    ]);
    const merged = mergeOffWindowEntries(h.cache.windowEntries(), offWindow, toFormValue);
    expect(merged.map((e) => e.id)).toEqual(['a', 'm', 'z']);
  });

  it('dedups by value across an off-window id churn (#1389)', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    h.setItems([a.handle]);
    h.cache.prime();
    const offWindow = new Map<number, LabelCacheEntry<string>>([
      [50, { id: 'a-remount', value: 'apple', label: 'Apple', disabled: false }],
    ]);
    const merged = mergeOffWindowEntries(h.cache.windowEntries(), offWindow, toFormValue);
    expect(merged.map((e) => e.value)).toEqual(['apple']);
    expect(merged.map((e) => e.id)).toEqual(['a']);
  });

  it('carries the disabled flag through the window read and the overlay (#1389)', () => {
    const h = createLabelCache();
    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple', disabled: true });
    h.setItems([a.handle]);
    h.cache.prime();
    expect(h.cache.windowEntries().find((e) => e.value === 'apple')?.disabled).toBe(true);

    const offWindow = new Map<number, LabelCacheEntry<string>>([
      [50, { id: 'b', value: 'banana', label: 'Banana', disabled: true }],
    ]);
    const merged = mergeOffWindowEntries(h.cache.windowEntries(), offWindow, toFormValue);
    expect(merged.find((e) => e.value === 'banana')?.disabled).toBe(true);
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

    it('purges carried-over off-window entries on invalidateSnapshot() (no totalCount transition)', () => {
      const h = createNavigator({ total: 1000, range: [0, 1] });
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-500', value: 'b', label: 'Row 500', posInSet: 500 });
      h.setItems([a.handle, b.handle]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.id).toBe('r-500');

      const a2 = makeHandle({ id: 'r-0b', value: 'a2', label: 'Row 0b', posInSet: 0 });
      h.setItems([a2.handle]);
      h.navigator.prime();
      expect(h.navigator.snapshotByPos().get(500)?.id).toBe('r-500');

      h.navigator.invalidateSnapshot();
      h.navigator.prime();
      const snap = h.navigator.snapshotByPos();
      expect(snap.has(500)).toBe(false);
      expect(snap.get(0)?.id).toBe('r-0b');
    });

    it('supplies the off-window labels the replaced window no longer carries', () => {
      const label = createLabelCache();
      const nav = createNavigator({ range: [0, 2] });
      const a = makeHandle({ id: 'r-0', value: 'a', label: 'Row 0', posInSet: 0 });
      const b = makeHandle({ id: 'r-1', value: 'b', label: 'Row 1', posInSet: 1 });
      label.setItems([a.handle, b.handle]);
      nav.setItems([a.handle, b.handle]);
      label.cache.prime();
      nav.navigator.prime();

      // Scroll to a different window — previously-rendered options unmount, so
      // the label cache's window is replaced and only the position map still
      // remembers them.
      const c = makeHandle({ id: 'r-50', value: 'c', label: 'Row 50', posInSet: 50 });
      label.setItems([c.handle]);
      nav.setItems([c.handle]);
      nav.setRange([50, 51]);
      label.cache.prime();
      nav.navigator.prime();

      expect(label.cache.windowEntries().map((e) => e.label)).toEqual(['Row 50']);

      const merged = mergeOffWindowEntries(
        label.cache.windowEntries(),
        nav.navigator.snapshotByPos(),
        toFormValue,
      );
      expect(merged.map((e) => e.label)).toEqual(['Row 50', 'Row 0', 'Row 1']);
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

    it('seedFirstRenderedEnabled picks the first enabled position', () => {
      const h = createNavigator({ range: [0, 5] });
      const items = [
        makeHandle({ id: 'r-0', value: 'a', label: 'a', posInSet: 0, disabled: true }),
        makeHandle({ id: 'r-1', value: 'b', label: 'b', posInSet: 1 }),
        makeHandle({ id: 'r-2', value: 'c', label: 'c', posInSet: 2 }),
      ];
      h.setItems(items.map((it) => it.handle));
      h.navigator.prime();

      h.navigator.seedFirstRenderedEnabled('first');
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
      h.navigator.seedFirstRenderedEnabled('first');
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

      h.navigator.seedFirstRenderedEnabled('first');

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

describe('LabelCache reactivity', () => {
  @Component({
    template: '',
  })
  class ZonelessHost {}

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('folds newly-mounted handles into the window and resolves selected labels', () => {
    TestBed.createComponent(ZonelessHost);

    const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
    const value = signal<readonly string[]>([]);
    const cache = new LabelCache<string>({
      items,
      value,
      itemToFormValue: signal(toFormValue),
    });

    const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
    items.set([a.handle]);
    cache.prime();
    expect(cache.windowEntries().map((e) => e.id)).toEqual(['a']);

    const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
    items.set([a.handle, b.handle]);
    cache.prime();
    expect(cache.windowEntries().map((e) => e.id)).toEqual(['a', 'b']);

    value.set(['banana']);
    expect(cache.selectedEntries().map((e) => e.label)).toEqual(['Banana']);
  });
});
