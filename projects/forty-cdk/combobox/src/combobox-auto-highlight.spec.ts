import {
  computed,
  provideZonelessChangeDetection,
  signal,
  type WritableSignal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { unsetInput } from 'forty-cdk/core';

import { createActiveIdSignal, resolveAutoHighlightSeed } from './combobox-auto-highlight';
import type { ForComboboxInitialFocus, ForComboboxOptionHandle } from './combobox-context';

interface FakeOption {
  readonly handle: ForComboboxOptionHandle<string>;
  setDisabled(v: boolean): void;
  setValue(v: string): void;
}

/**
 * Build a `ForComboboxOptionHandle` backed by writable signals so a test can
 * mutate per-handle state without re-creating the collection. Mirrors the
 * helper in `combobox-snapshot.spec.ts`.
 */
function makeHandle(opts: {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
}): FakeOption {
  const id = signal(opts.id);
  const value = signal(opts.value);
  const label = signal(opts.label);
  const posInSet = signal<number | null>(null);
  const disabled = signal(opts.disabled ?? false);
  const host = document.createElement('div');
  return {
    handle: { id, value, label, disabled, posInSet, host },
    setDisabled: (v) => disabled.set(v),
    setValue: (v) => value.set(v),
  };
}

const equals = (a: string, b: string) => a === b;

describe('resolveAutoHighlightSeed', () => {
  it('returns the first enabled option for initialFocus="first"', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A', disabled: true });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    const c = makeHandle({ id: 'c', value: 'c', label: 'C' });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle, c.handle],
      initialFocus: 'first',
      value: [],
      equals,
    });
    expect(seed).toBe('b');
  });

  it('returns the last enabled option for initialFocus="last"', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    const c = makeHandle({ id: 'c', value: 'c', label: 'C', disabled: true });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle, c.handle],
      initialFocus: 'last',
      value: [],
      equals,
    });
    expect(seed).toBe('b');
  });

  it('returns null when every option is disabled', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A', disabled: true });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B', disabled: true });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle],
      initialFocus: 'first',
      value: [],
      equals,
    });
    expect(seed).toBeNull();
  });

  it('returns null for an empty list', () => {
    const seed = resolveAutoHighlightSeed({
      items: [],
      initialFocus: 'first',
      value: [],
      equals,
    });
    expect(seed).toBeNull();
  });

  it('seeds the selected enabled option for initialFocus="selected"', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    const c = makeHandle({ id: 'c', value: 'c', label: 'C' });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle, c.handle],
      initialFocus: 'selected',
      value: ['b'],
      equals,
    });
    expect(seed).toBe('b');
  });

  it('falls back to first enabled when the selected value matches no enabled option', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle],
      initialFocus: 'selected',
      value: ['missing'],
      equals,
    });
    expect(seed).toBe('a');
  });

  it('skips a disabled option that holds the selected value, falling back to first enabled', () => {
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B', disabled: true });
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle],
      initialFocus: 'selected',
      value: ['b'],
      equals,
    });
    expect(seed).toBe('a');
  });

  it('honors a custom equality fn for object-identity matching by key', () => {
    const a = makeHandle({ id: 'a', value: 'id:1', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'id:2', label: 'B' });
    const byPrefix = (x: string, y: string) => x.split(':')[0] === y.split(':')[0];
    const seed = resolveAutoHighlightSeed({
      items: [a.handle, b.handle],
      initialFocus: 'selected',
      value: ['id:zzz'],
      equals: byPrefix,
    });
    expect(seed).toBe('a');
  });

  it('holds the seed back while an option value binding is unwritten, then resolves it', () => {
    const bound = signal<string | null>(null);
    const pending = makeHandle({ id: 'pending', value: 'x', label: 'Pending' });
    const handle: ForComboboxOptionHandle<string> = {
      ...pending.handle,
      value: computed(() => bound() ?? unsetInput<string>()),
    };
    const later = makeHandle({ id: 'later', value: 'cherry', label: 'Cherry' });
    const seedInput = {
      items: [handle, later.handle],
      initialFocus: 'selected' as ForComboboxInitialFocus,
      value: ['cherry'],
      equals,
    };

    expect(resolveAutoHighlightSeed(seedInput)).toBeNull();

    bound.set('apple');
    expect(resolveAutoHighlightSeed(seedInput)).toBe('later');
  });

  it('never hands an unwritten value to the consumer equality fn', () => {
    const seen: unknown[] = [];
    const pending = makeHandle({ id: 'pending', value: 'x', label: 'Pending' });
    const handle: ForComboboxOptionHandle<string> = {
      ...pending.handle,
      value: computed(() => unsetInput<string>()),
    };

    resolveAutoHighlightSeed({
      items: [handle],
      initialFocus: 'selected',
      value: ['cherry'],
      equals: (a, b) => {
        seen.push(a, b);
        return a === b;
      },
    });

    expect(seen).toEqual([]);
  });
});

interface ActiveIdHarness {
  readonly active: () => string | null;
  readonly setActive: (id: string | null) => void;
  readonly query: WritableSignal<string>;
  readonly open: WritableSignal<boolean>;
  readonly autoHighlight: WritableSignal<boolean>;
  readonly virtualized: WritableSignal<boolean>;
  readonly initialFocus: WritableSignal<ForComboboxInitialFocus>;
  readonly items: WritableSignal<readonly ForComboboxOptionHandle<string>[]>;
  readonly value: WritableSignal<readonly string[]>;
}

function createActiveIdHarness(
  init: { open?: boolean; autoHighlight?: boolean; virtualized?: boolean } = {},
): ActiveIdHarness {
  const query = signal('');
  const open = signal(init.open ?? true);
  const autoHighlight = signal(init.autoHighlight ?? true);
  const virtualized = signal(init.virtualized ?? false);
  const initialFocus = signal<ForComboboxInitialFocus>('first');
  const items = signal<readonly ForComboboxOptionHandle<string>[]>([]);
  const value = signal<readonly string[]>([]);

  const sig = createActiveIdSignal<string>({
    query: () => query(),
    open: () => open(),
    autoHighlight: () => autoHighlight(),
    virtualized: () => virtualized(),
    initialFocus: () => initialFocus(),
    items: () => items(),
    value: () => value(),
    equals: () => equals,
  });

  return {
    active: () => sig(),
    setActive: (id) => sig.set(id),
    query,
    open,
    autoHighlight,
    virtualized,
    initialFocus,
    items,
    value,
  };
}

describe('createActiveIdSignal', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('seeds the first enabled option when open with auto-highlight', () => {
    const h = createActiveIdHarness();
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    h.items.set([a.handle, b.handle]);
    expect(h.active()).toBe('a');
  });

  it('does not seed when auto-highlight is off', () => {
    const h = createActiveIdHarness({ autoHighlight: false });
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    h.items.set([a.handle]);
    expect(h.active()).toBeNull();
  });

  it('does not seed when closed', () => {
    const h = createActiveIdHarness({ open: false });
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    h.items.set([a.handle]);
    expect(h.active()).toBeNull();
  });

  it('returns null in the virtualized branch (the effect seeds imperatively)', () => {
    const h = createActiveIdHarness({ virtualized: true });
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    h.items.set([a.handle]);
    expect(h.active()).toBeNull();
  });

  it('preserves a surviving imperative pointer (arrow nav) across re-runs', () => {
    const h = createActiveIdHarness();
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    h.items.set([a.handle, b.handle]);
    h.setActive('b');
    // A non-query source change re-runs the computation; the pointer survives.
    h.value.set(['a']);
    expect(h.active()).toBe('b');
  });

  it('drops the pointer when the active option leaves the registry', () => {
    const h = createActiveIdHarness();
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    h.items.set([a.handle, b.handle]);
    h.setActive('b');
    // The consumer mutates the list, removing the active option.
    h.items.set([a.handle]);
    expect(h.active()).toBe('a');
  });

  it('drops the pointer and re-seeds first on a query change', () => {
    const h = createActiveIdHarness();
    const a = makeHandle({ id: 'a', value: 'a', label: 'A' });
    const b = makeHandle({ id: 'b', value: 'b', label: 'B' });
    h.items.set([a.handle, b.handle]);
    h.setActive('b');
    h.query.set('typed');
    expect(h.active()).toBe('a');
  });
});
