import { signal } from '@angular/core';

import type { DisableableHandle } from '../collection/first-enabled-host';
import { nextEnabledHandle } from './move-in-collection';

interface TestHandle extends DisableableHandle {
  readonly value: string;
}

function makeItems(specs: { value: string; disabled?: boolean }[]): TestHandle[] {
  return specs.map((spec) => ({
    host: document.createElement('button'),
    disabled: signal(spec.disabled ?? false),
    value: spec.value,
  }));
}

describe('nextEnabledHandle', () => {
  it('returns null on an empty list', () => {
    expect(nextEnabledHandle([], 0, 'next')).toBeNull();
    expect(nextEnabledHandle([], document.createElement('div'), 'first')).toBeNull();
  });

  describe('resolving the current index from a host', () => {
    it('moves to the next / previous handle', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      expect(nextEnabledHandle(items, items[0]!.host, 'next')).toBe(items[1]);
      expect(nextEnabledHandle(items, items[2]!.host, 'prev')).toBe(items[1]);
    });

    it('does not wrap by default and wraps when loop is true', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      expect(nextEnabledHandle(items, items[2]!.host, 'next')).toBeNull();
      expect(nextEnabledHandle(items, items[2]!.host, 'next', { loop: true })).toBe(items[0]);
      expect(nextEnabledHandle(items, items[0]!.host, 'prev', { loop: true })).toBe(items[2]);
    });

    it('skips disabled handles', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b', disabled: true }, { value: 'c' }]);
      expect(nextEnabledHandle(items, items[0]!.host, 'next')).toBe(items[2]);
    });

    it('treats a host not in the list as starting from index 0', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      const orphan = document.createElement('button');
      expect(nextEnabledHandle(items, orphan, 'next')).toBe(items[1]);
    });

    it('resolves first / last to the first / last enabled handle', () => {
      const items = makeItems([
        { value: 'a', disabled: true },
        { value: 'b' },
        { value: 'c' },
        { value: 'd', disabled: true },
      ]);
      expect(nextEnabledHandle(items, items[2]!.host, 'first')).toBe(items[1]);
      expect(nextEnabledHandle(items, items[1]!.host, 'last')).toBe(items[2]);
    });

    it('returns null when every handle is disabled', () => {
      const items = makeItems([
        { value: 'a', disabled: true },
        { value: 'b', disabled: true },
      ]);
      expect(nextEnabledHandle(items, items[0]!.host, 'next', { loop: true })).toBeNull();
    });
  });

  describe('using an explicit index verbatim', () => {
    it('does not clamp a negative index, so first / last ignore it', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      expect(nextEnabledHandle(items, -1, 'first')).toBe(items[0]);
      expect(nextEnabledHandle(items, -1, 'last')).toBe(items[2]);
    });

    it('steps from the given index for next / prev', () => {
      const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
      expect(nextEnabledHandle(items, 1, 'next')).toBe(items[2]);
      expect(nextEnabledHandle(items, 1, 'prev')).toBe(items[0]);
    });
  });
});
