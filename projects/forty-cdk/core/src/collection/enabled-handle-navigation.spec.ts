import { signal } from '@angular/core';

import {
  type DisableableHandle,
  firstEnabledHandle,
  firstEnabledHost,
  lastEnabledHandle,
  lastEnabledHost,
  nextEnabledHandle,
} from './enabled-handle-navigation';

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

describe('firstEnabledHost', () => {
  it('returns null on an empty list', () => {
    expect(firstEnabledHost([])).toBeNull();
  });

  it('returns null when every handle is disabled', () => {
    const items = makeItems([
      { value: 'a', disabled: true },
      { value: 'b', disabled: true },
    ]);
    expect(firstEnabledHost(items)).toBeNull();
  });

  it('returns the host of the first non-disabled handle', () => {
    const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c' }]);
    expect(firstEnabledHost(items)).toBe(items[0]!.host);
  });

  it('skips leading disabled handles', () => {
    const items = makeItems([
      { value: 'a', disabled: true },
      { value: 'b', disabled: true },
      { value: 'c' },
    ]);
    expect(firstEnabledHost(items)).toBe(items[2]!.host);
  });
});

describe('firstEnabledHandle', () => {
  it('returns null on an empty list and when every handle is disabled', () => {
    expect(firstEnabledHandle([])).toBeNull();
    const items = makeItems([
      { value: 'a', disabled: true },
      { value: 'b', disabled: true },
    ]);
    expect(firstEnabledHandle(items)).toBeNull();
  });

  it('returns the handle itself, skipping leading disabled ones', () => {
    const items = makeItems([{ value: 'a', disabled: true }, { value: 'b' }, { value: 'c' }]);
    expect(firstEnabledHandle(items)).toBe(items[1]);
  });

  it('reads `disabled` per call, so a handle re-enabled later wins', () => {
    const disabled = signal(true);
    const items: TestHandle[] = [
      { host: document.createElement('button'), disabled, value: 'a' },
      ...makeItems([{ value: 'b' }]),
    ];
    expect(firstEnabledHandle(items)).toBe(items[1]);

    disabled.set(false);
    expect(firstEnabledHandle(items)).toBe(items[0]);
  });
});

describe('lastEnabledHandle', () => {
  it('returns null on an empty list and when every handle is disabled', () => {
    expect(lastEnabledHandle([])).toBeNull();
    const items = makeItems([
      { value: 'a', disabled: true },
      { value: 'b', disabled: true },
    ]);
    expect(lastEnabledHandle(items)).toBeNull();
  });

  it('returns the last handle, skipping trailing disabled ones', () => {
    const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c', disabled: true }]);
    expect(lastEnabledHandle(items)).toBe(items[1]);
  });

  it('scans from the end, so it disagrees with its forward twin on a mixed list', () => {
    const items = makeItems([{ value: 'a' }, { value: 'b' }]);
    expect(firstEnabledHandle(items)).toBe(items[0]);
    expect(lastEnabledHandle(items)).toBe(items[1]);
  });
});

describe('lastEnabledHost', () => {
  it('returns null on an empty list and when every handle is disabled', () => {
    expect(lastEnabledHost([])).toBeNull();
    const items = makeItems([
      { value: 'a', disabled: true },
      { value: 'b', disabled: true },
    ]);
    expect(lastEnabledHost(items)).toBeNull();
  });

  it('returns the host of the last non-disabled handle', () => {
    const items = makeItems([{ value: 'a' }, { value: 'b' }, { value: 'c', disabled: true }]);
    expect(lastEnabledHost(items)).toBe(items[1]!.host);
  });
});
