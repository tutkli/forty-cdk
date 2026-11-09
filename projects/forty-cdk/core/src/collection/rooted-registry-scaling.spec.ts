import { signal } from '@angular/core';

import { type RootedHandle, RootedRegistry } from './rooted-registry';

interface Root {
  readonly name: string;
}

type Handle = RootedHandle<Root>;

describe('RootedRegistry scaling', () => {
  it('visits a linear number of handle slots when N handles are added then removed', () => {
    const n = 2000;
    const root: Root = { name: 'root' };
    const handles: Handle[] = Array.from({ length: n }, () => ({
      root: signal<Root | null>(root).asReadonly(),
    }));
    const known = new Set<unknown>(handles);
    const registry = new RootedRegistry<Root, Handle>();

    let visits = 0;
    const isHandleArray = (array: readonly unknown[]): boolean =>
      array.length > 0 && known.has(array[0]);
    const originalFilter = Array.prototype.filter;
    const originalIterator = Array.prototype[Symbol.iterator];
    Array.prototype.filter = function (
      this: unknown[],
      ...args: Parameters<typeof originalFilter>
    ) {
      if (isHandleArray(this)) {
        visits += this.length;
      }
      return originalFilter.apply(this, args);
    } as typeof originalFilter;
    Array.prototype[Symbol.iterator] = function (this: unknown[]) {
      if (isHandleArray(this)) {
        visits += this.length;
      }
      return originalIterator.call(this);
    } as typeof originalIterator;

    let addVisits = 0;
    let removeVisits = 0;
    try {
      for (const handle of handles.slice()) {
        registry.add(handle);
      }
      addVisits = visits;
      visits = 0;
      for (const handle of handles.slice()) {
        registry.remove(handle);
      }
      removeVisits = visits;
    } finally {
      Array.prototype.filter = originalFilter;
      Array.prototype[Symbol.iterator] = originalIterator;
    }

    expect(registry.of(root)()).toEqual([]);
    const budget = 4 * n;
    expect
      .soft(
        addVisits,
        `add(): ${addVisits} handle-slot visits for ${n} handles (linear budget ${budget}, quadratic ~${(n * n) / 2})`,
      )
      .toBeLessThanOrEqual(budget);
    expect
      .soft(
        removeVisits,
        `remove(): ${removeVisits} handle-slot visits for ${n} handles (linear budget ${budget}, quadratic ~${(n * n) / 2})`,
      )
      .toBeLessThanOrEqual(budget);
  });
});
