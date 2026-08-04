import { computed, signal } from '@angular/core';

import { RovingTabindex } from './roving-tabindex';
import { rovingListTarget, rovingTabStop, selectionTabStop } from './roving-list-navigation';

interface Handle {
  host: HTMLElement;
  disabled: boolean;
}

const makeItems = (n: number): Handle[] =>
  Array.from({ length: n }, () => ({ host: document.createElement('button'), disabled: false }));

describe('rovingListTarget', () => {
  it("'next' from index 0 lands on index 1 even when index 1 is disabled (not skipped)", () => {
    const items = makeItems(3);
    items[1]!.disabled = true;
    const target = rovingListTarget(items, items[0]!.host, 'next');
    expect(target).toBe(items[1]);
  });

  it("'first' returns index 0 and 'last' returns the last index regardless of disabled endpoints", () => {
    const items = makeItems(3);
    items[0]!.disabled = true;
    items[2]!.disabled = true;
    expect(rovingListTarget(items, items[1]!.host, 'first')).toBe(items[0]);
    expect(rovingListTarget(items, items[1]!.host, 'last')).toBe(items[2]);
  });

  it('treats a host not present in items as index 0', () => {
    const items = makeItems(3);
    const stray = document.createElement('button');
    expect(rovingListTarget(items, stray, 'next')).toBe(items[1]);
  });

  it('uses a numeric current verbatim', () => {
    const items = makeItems(3);
    expect(rovingListTarget(items, 1, 'next')).toBe(items[2]);
    expect(rovingListTarget(items, -1, 'next')).toBe(items[0]);
  });

  it('loop=true wraps last→first on next; loop=false returns null past the end', () => {
    const items = makeItems(3);
    expect(rovingListTarget(items, items[2]!.host, 'next', { loop: true })).toBe(items[0]);
    expect(rovingListTarget(items, items[2]!.host, 'next', { loop: false })).toBe(null);
  });

  it('returns null for an empty list', () => {
    expect(rovingListTarget([], 0, 'next')).toBe(null);
  });
});

describe('selectionTabStop', () => {
  const base = () => ({
    disabled: false,
    selected: false,
    hasSelected: false,
    isFirstEnabled: false,
  });

  it('disabled → -1 even when selected and first enabled', () => {
    expect(
      selectionTabStop({ ...base(), disabled: true, selected: true, isFirstEnabled: true }),
    ).toBe(-1);
  });

  it('selected → 0', () => {
    expect(selectionTabStop({ ...base(), selected: true })).toBe(0);
  });

  it('another item holds the selection → -1', () => {
    expect(selectionTabStop({ ...base(), hasSelected: true })).toBe(-1);
  });

  it('a selection matching no enabled item falls back to the first enabled one (#1132 / #1170)', () => {
    expect(selectionTabStop({ ...base(), isFirstEnabled: true })).toBe(0);
    expect(selectionTabStop({ ...base(), isFirstEnabled: false })).toBe(-1);
  });

  it('keeps the tab stop on the selected item where rovingTabStop would hand it to the tracker', () => {
    const host = document.createElement('button');
    const focused = document.createElement('button');
    document.body.append(host, focused);
    try {
      const roving = new RovingTabindex();
      roving.setActive(focused);
      const selection = { ...base(), selected: true };

      expect(selectionTabStop(selection)).toBe(0);
      expect(rovingTabStop({ ...selection, roving, host })).toBe(-1);
    } finally {
      host.remove();
      focused.remove();
    }
  });
});

describe('rovingTabStop', () => {
  const base = () => ({
    disabled: false,
    selected: false,
    hasSelected: false,
    isFirstEnabled: false,
    roving: new RovingTabindex(),
    host: document.createElement('button'),
  });

  it('disabled → -1 even when selected and first enabled', () => {
    expect(rovingTabStop({ ...base(), disabled: true, selected: true, isFirstEnabled: true })).toBe(
      -1,
    );
  });

  it('roving.hasActive() → returns roving.tabindexFor(host)', () => {
    const roving = new RovingTabindex();
    const host = document.createElement('button');
    const other = document.createElement('button');
    document.body.append(host, other);
    try {
      roving.setActive(host);
      expect(rovingTabStop({ ...base(), roving, host })).toBe(0);
      expect(rovingTabStop({ ...base(), roving, host: other })).toBe(-1);
    } finally {
      host.remove();
      other.remove();
    }
  });

  it('no active + selected → 0', () => {
    expect(rovingTabStop({ ...base(), selected: true })).toBe(0);
  });

  it('no active + not selected + hasSelected → -1', () => {
    expect(rovingTabStop({ ...base(), hasSelected: true })).toBe(-1);
  });

  it('no active + not selected + not hasSelected → isFirstEnabled ? 0 : -1', () => {
    expect(rovingTabStop({ ...base(), isFirstEnabled: true })).toBe(0);
    expect(rovingTabStop({ ...base(), isFirstEnabled: false })).toBe(-1);
  });

  it('is reactive to roving.setActive in a computed', () => {
    const roving = new RovingTabindex();
    const host = document.createElement('button');
    document.body.append(host);
    try {
      const source = signal(true);
      const ti = computed(() => rovingTabStop({ ...base(), selected: source(), roving, host }));
      expect(ti()).toBe(0);
      roving.setActive(host);
      expect(ti()).toBe(0);
      const other = document.createElement('button');
      document.body.append(other);
      try {
        roving.setActive(other);
        expect(ti()).toBe(-1);
      } finally {
        other.remove();
      }
    } finally {
      host.remove();
    }
  });
});
