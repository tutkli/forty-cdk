import { computed, provideZonelessChangeDetection, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { unsetInput } from '../unset-input/unset-input';
import { LabelCache, type LabelCacheHandle } from './label-cache';

function makeHandle(opts: {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}): LabelCacheHandle<string> {
  return {
    id: signal(opts.id),
    value: signal(opts.value),
    label: signal(opts.label),
    disabled: signal(opts.disabled ?? false),
  };
}

interface Harness {
  readonly cache: LabelCache<string>;
  readonly setItems: (items: readonly LabelCacheHandle<string>[]) => void;
  readonly setValue: (value: readonly string[]) => void;
  readonly windowIds: () => readonly string[];
  readonly selectedIds: () => readonly string[];
  readonly selectedLabels: () => readonly string[];
}

function createCache(initialValue: readonly string[] = []): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const items = signal<readonly LabelCacheHandle<string>[]>([]);
  const value = signal<readonly string[]>(initialValue);
  const cache = new LabelCache<string>({
    items,
    value,
    itemToFormValue: signal((item: string) => item),
  });
  return {
    cache,
    setItems: (next) => items.set(next),
    setValue: (next) => value.set(next),
    windowIds: () => cache.windowEntries().map((e) => e.id),
    selectedIds: () => cache.selectedEntries().map((e) => e.id),
    selectedLabels: () => cache.selectedEntries().map((e) => e.label),
  };
}

describe('LabelCache', () => {
  it('starts empty on both projections', () => {
    const h = createCache(['apple']);
    expect(h.cache.windowEntries()).toEqual([]);
    expect(h.cache.selectedEntries()).toEqual([]);
  });

  describe('windowEntries', () => {
    it('reads the live window in DOM order with the disabled flag', () => {
      const h = createCache();
      h.setItems([
        makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
        makeHandle({ id: 'b', value: 'banana', label: 'Banana', disabled: true }),
      ]);
      expect(h.cache.windowEntries()).toEqual([
        { id: 'a', value: 'apple', label: 'Apple', disabled: false },
        { id: 'b', value: 'banana', label: 'Banana', disabled: true },
      ]);
    });

    it('persists across an empty window (close → re-open)', () => {
      const h = createCache();
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      h.cache.prime();
      h.setItems([]);
      expect(h.windowIds()).toEqual(['a']);
    });

    it('replaces rather than merges, so an option removed while open is purged', () => {
      const h = createCache();
      const a = makeHandle({ id: 'a', value: 'apple', label: 'Apple' });
      const b = makeHandle({ id: 'b', value: 'banana', label: 'Banana' });
      h.setItems([a, b]);
      h.cache.prime();

      h.setItems([a]);
      expect(h.windowIds()).toEqual(['a']);
    });

    it('heals a relabeled option that re-registers under a fresh id but the same value', () => {
      const h = createCache();
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      h.cache.prime();
      h.setItems([makeHandle({ id: 'a2', value: 'apple', label: 'Green Apple' })]);
      expect(h.cache.windowEntries()).toEqual([
        { id: 'a2', value: 'apple', label: 'Green Apple', disabled: false },
      ]);
    });

    it('de-duplicates two handles carrying the same form value', () => {
      const h = createCache();
      h.setItems([
        makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
        makeHandle({ id: 'a-dup', value: 'apple', label: 'Apple again' }),
      ]);
      expect(h.cache.windowEntries()).toEqual([
        { id: 'a-dup', value: 'apple', label: 'Apple again', disabled: false },
      ]);
    });
  });

  describe('selectedEntries', () => {
    it('resolves a value selected while its option is live', () => {
      const h = createCache();
      h.setItems([
        makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
        makeHandle({ id: 'b', value: 'banana', label: 'Banana' }),
      ]);
      h.setValue(['banana']);
      expect(h.selectedLabels()).toEqual(['Banana']);
    });

    it('keeps resolving after the options unmount', () => {
      const h = createCache();
      h.setItems([makeHandle({ id: 'b', value: 'banana', label: 'Banana' })]);
      h.setValue(['banana']);
      h.cache.prime();

      h.setItems([]);
      expect(h.selectedLabels()).toEqual(['Banana']);
    });

    it('keeps resolving across a window that no longer contains the value', () => {
      const h = createCache();
      h.setItems([makeHandle({ id: 'b', value: 'banana', label: 'Banana' })]);
      h.setValue(['banana']);
      h.cache.prime();

      h.setItems([makeHandle({ id: 'z', value: 'zucchini', label: 'Zucchini' })]);
      expect(h.selectedLabels()).toEqual(['Banana']);
      expect(h.windowIds()).toEqual(['z']);
    });

    it('resolves a value selected out of the carried window while closed', () => {
      const h = createCache();
      h.setItems([
        makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
        makeHandle({ id: 'c', value: 'cherry', label: 'Cherry' }),
      ]);
      h.cache.prime();
      h.setItems([]);

      h.setValue(['cherry']);
      expect(h.selectedLabels()).toEqual(['Cherry']);
    });

    it('follows selection order and drops a value that leaves the selection', () => {
      const h = createCache();
      h.setItems([
        makeHandle({ id: 'a', value: 'apple', label: 'Apple' }),
        makeHandle({ id: 'b', value: 'banana', label: 'Banana' }),
      ]);
      h.setValue(['banana', 'apple']);
      expect(h.selectedIds()).toEqual(['b', 'a']);

      h.setValue(['apple']);
      expect(h.selectedIds()).toEqual(['a']);

      h.setValue([]);
      expect(h.cache.selectedEntries()).toEqual([]);
    });

    it('omits a selected value whose option was never observed', () => {
      const h = createCache(['never-rendered']);
      h.setItems([makeHandle({ id: 'a', value: 'apple', label: 'Apple' })]);
      expect(h.cache.selectedEntries()).toEqual([]);
    });

    it('does not re-read the window when only the selection changes', () => {
      const h = createCache();
      let reads = 0;
      const label = signal('Apple');
      const counting: LabelCacheHandle<string> = {
        id: signal('a'),
        value: signal('apple'),
        disabled: signal(false),
        label: (() => {
          reads++;
          return label();
        }) as unknown as Signal<string>,
      };
      h.setItems([counting]);
      h.cache.prime();
      const afterFirstWindow = reads;
      expect(afterFirstWindow).toBeGreaterThan(0);

      h.setValue(['apple']);
      h.cache.prime();

      expect(h.selectedLabels()).toEqual(['Apple']);
      expect(reads).toBe(afterFirstWindow);
    });
  });

  describe('boundedness', () => {
    it('stays at the selection size across successive disjoint query rebuilds', () => {
      const h = createCache();
      const windowSize = 20;
      const rebuilds = 25;

      const firstWindow = Array.from({ length: windowSize }, (_, i) =>
        makeHandle({ id: `q0-${i}`, value: `q0-v${i}`, label: `Q0 ${i}` }),
      );
      h.setItems(firstWindow);
      h.setValue(['q0-v3']);
      h.cache.prime();

      for (let q = 1; q < rebuilds; q++) {
        h.setItems([]);
        h.setItems(
          Array.from({ length: windowSize }, (_, i) =>
            makeHandle({ id: `q${q}-${i}`, value: `q${q}-v${i}`, label: `Q${q} ${i}` }),
          ),
        );
        h.cache.prime();
      }

      expect(h.cache.selectedEntries().length).toBe(1);
      expect(h.selectedLabels()).toEqual(['Q0 3']);
      expect(h.cache.windowEntries().length).toBe(windowSize);
      expect(h.windowIds()[0]).toBe(`q${rebuilds - 1}-0`);
    });
  });

  describe('unwritten bindings', () => {
    it('skips a handle whose value binding is not written yet, reading it on the re-run', () => {
      const h = createCache();
      const value = signal<string | null>(null);
      const pending: LabelCacheHandle<string> = {
        id: signal('p'),
        label: signal('Pending'),
        disabled: signal(false),
        value: computed(() => value() ?? unsetInput<string>()),
      };
      h.setItems([pending]);
      expect(h.cache.windowEntries()).toEqual([]);

      value.set('pear');
      expect(h.cache.windowEntries()).toEqual([
        { id: 'p', value: 'pear', label: 'Pending', disabled: false },
      ]);
    });

    it('never reads the label of a handle whose value binding is unwritten', () => {
      const h = createCache();
      const value = signal<string | null>(null);
      const resolveLabel = vi.fn(() => 'Pending');
      const pending: LabelCacheHandle<string> = {
        id: signal('p'),
        label: computed(resolveLabel),
        disabled: signal(false),
        value: computed(() => value() ?? unsetInput<string>()),
      };
      h.setItems([pending]);
      h.cache.windowEntries();
      expect(resolveLabel).not.toHaveBeenCalled();

      value.set('pear');
      h.cache.windowEntries();
      expect(resolveLabel).toHaveBeenCalled();
    });

    it('propagates a throw out of the read', () => {
      const h = createCache();
      const broken: LabelCacheHandle<string> = {
        id: signal('x'),
        label: signal('X'),
        disabled: signal(false),
        value: (() => {
          throw new Error('boom');
        }) as unknown as Signal<string>,
      };
      h.setItems([broken]);
      expect(() => h.cache.windowEntries()).toThrow('boom');
    });
  });
});
