import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RangeSelectionEngine, type RangeSelectionOptionHandle } from './range-selection-engine';

interface FakeHandle extends RangeSelectionOptionHandle<string> {
  readonly value: WritableSignal<string>;
  readonly disabled: WritableSignal<boolean>;
}

interface Harness {
  readonly engine: RangeSelectionEngine<string, FakeHandle>;
  readonly value: WritableSignal<readonly string[]>;
  readonly multiple: WritableSignal<boolean>;
  readonly disabled: WritableSignal<boolean>;
  readonly readonly: WritableSignal<boolean>;
  readonly setValue: ReturnType<typeof vi.fn>;
  readonly parent: HTMLElement;
  handle(value: string, opts?: { disabled?: boolean }): FakeHandle;
}

function createHarness(): Harness {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const parent = document.createElement('div');
  document.body.appendChild(parent);

  const options = signal<readonly FakeHandle[]>([]);
  const value = signal<readonly string[]>([]);
  const multiple = signal(true);
  const disabled = signal(false);
  const readonly = signal(false);
  const setValue = vi.fn((v: readonly string[]) => value.set(v));

  const engine = new RangeSelectionEngine<string, FakeHandle>({
    options,
    value,
    setValue,
    isItemEqualToValue: signal((a: string, b: string) => a === b),
    multiple,
    effectiveDisabled: disabled,
    readonly,
  });

  const handle: Harness['handle'] = (v, opts = {}) => {
    const host = document.createElement('button');
    host.tabIndex = -1;
    parent.appendChild(host);
    const item: FakeHandle = { host, value: signal(v), disabled: signal(opts.disabled ?? false) };
    options.update((items) => [...items, item]);
    return item;
  };

  return { engine, value, multiple, disabled, readonly, setValue, parent, handle };
}

describe('RangeSelectionEngine', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.parent.remove();
  });

  describe('selectSingle', () => {
    it('replaces the selection with the single value', () => {
      h.value.set(['a']);
      h.engine.selectSingle('b');
      expect(h.value()).toEqual(['b']);
    });

    it('is idempotent when the same sole value is already selected', () => {
      h.value.set(['b']);
      h.setValue.mockClear();
      h.engine.selectSingle('b');
      expect(h.setValue).not.toHaveBeenCalled();
      expect(h.value()).toEqual(['b']);
    });
  });

  describe('selectRangeToFocused', () => {
    it('selects the inclusive range from anchor to focused, preserving outside selection', () => {
      h.handle('a');
      h.handle('b');
      const c = h.handle('c');
      const d = h.handle('d');
      h.value.set(['a']);
      h.engine.setAnchor('b');
      h.engine.selectRangeToFocused(d.host);
      expect(h.value()).toEqual(['a', 'b', 'c', 'd']);
      h.engine.selectRangeToFocused(c.host);
      expect(h.value()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('skips disabled options inside the range', () => {
      h.handle('a');
      h.handle('b', { disabled: true });
      const c = h.handle('c');
      h.engine.setAnchor('a');
      h.engine.selectRangeToFocused(c.host);
      expect(h.value()).toEqual(['a', 'c']);
    });

    it('selects just the focused option when no anchor exists', () => {
      h.handle('a');
      const b = h.handle('b');
      h.engine.selectRangeToFocused(b.host);
      expect(h.value()).toEqual(['b']);
    });
  });

  describe('extendByArrow', () => {
    it('toggles the next enabled option without moving the anchor', () => {
      const a = h.handle('a');
      h.handle('b');
      h.value.set(['a']);
      h.engine.setAnchor('a');
      h.engine.extendByArrow(a.host, 'next');
      expect(h.value()).toEqual(['a', 'b']);
    });

    it('skips disabled neighbors and does not wrap', () => {
      const a = h.handle('a');
      h.handle('b', { disabled: true });
      h.engine.extendByArrow(a.host, 'next');
      expect(h.value()).toEqual([]);
    });

    it('blocks the selection mutation when readonly', () => {
      const a = h.handle('a');
      h.handle('b');
      h.readonly.set(true);
      h.engine.extendByArrow(a.host, 'next');
      expect(h.value()).toEqual([]);
    });
  });

  describe('selectAll', () => {
    it('selects every enabled option, then clears when all are selected (toggle)', () => {
      h.handle('a');
      h.handle('b', { disabled: true });
      h.handle('c');
      h.engine.selectAll();
      expect(h.value()).toEqual(['a', 'c']);
      h.engine.selectAll();
      expect(h.value()).toEqual([]);
    });
  });

  describe('selectFromCurrentToEdge', () => {
    it('selects from the focused option to the first edge', () => {
      h.handle('a');
      h.handle('b');
      const c = h.handle('c');
      h.engine.selectFromCurrentToEdge(c.host, 'first');
      expect(h.value()).toEqual(['a', 'b', 'c']);
    });

    it('selects from the focused option to the last edge', () => {
      const a = h.handle('a');
      h.handle('b');
      h.handle('c');
      h.engine.selectFromCurrentToEdge(a.host, 'last');
      expect(h.value()).toEqual(['a', 'b', 'c']);
    });
  });

  describe('guards', () => {
    it('range actions are no-ops in single mode', () => {
      const a = h.handle('a');
      const b = h.handle('b');
      h.multiple.set(false);
      h.engine.setAnchor('a');
      h.engine.selectRangeToFocused(b.host);
      h.engine.extendByArrow(a.host, 'next');
      h.engine.selectAll();
      h.engine.selectFromCurrentToEdge(a.host, 'last');
      expect(h.value()).toEqual([]);
    });

    it('range actions are no-ops when disabled', () => {
      const a = h.handle('a');
      h.handle('b');
      h.disabled.set(true);
      h.engine.selectAll();
      h.engine.extendByArrow(a.host, 'next');
      expect(h.value()).toEqual([]);
    });
  });
});
