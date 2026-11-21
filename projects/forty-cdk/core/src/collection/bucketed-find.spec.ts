import { signal, type WritableSignal } from '@angular/core';

import { BUCKET_SIZE, bucketedFind, bucketedLookup } from './bucketed-find';

interface Item {
  readonly name: string;
  readonly value: WritableSignal<string | null>;
}

function makeItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `item-${i}`,
    value: signal<string | null>(null),
  }));
}

describe('bucketedFind', () => {
  it('returns the first matching item in list order, or undefined', () => {
    const items = makeItems(BUCKET_SIZE * 3);
    const list = signal<readonly Item[]>(items);
    const found = bucketedFind(list, (item) => item.value() === 'x');

    expect(found()).toBeUndefined();

    items[BUCKET_SIZE * 2 + 5]!.value.set('x');
    expect(found()).toBe(items[BUCKET_SIZE * 2 + 5]);

    items[3]!.value.set('x');
    expect(found()).toBe(items[3]);

    items[3]!.value.set(null);
    expect(found()).toBe(items[BUCKET_SIZE * 2 + 5]);
  });

  it('follows a change to the list itself', () => {
    const items = makeItems(5);
    items[4]!.value.set('x');
    const list = signal<readonly Item[]>(items);
    const found = bucketedFind(list, (item) => item.value() === 'x');

    expect(found()).toBe(items[4]);

    list.set(items.slice(0, 4));
    expect(found()).toBeUndefined();

    list.set([]);
    expect(found()).toBeUndefined();
  });

  it('re-runs the match only over the bucket holding the item that changed', () => {
    const items = makeItems(BUCKET_SIZE * 10);
    const list = signal<readonly Item[]>(items);
    let calls = 0;
    const found = bucketedFind(list, (item) => {
      calls++;
      return item.value() === 'x';
    });

    expect(found()).toBeUndefined();
    expect(calls).toBe(items.length);

    calls = 0;
    items[BUCKET_SIZE * 7 + 1]!.value.set('y');
    expect(found()).toBeUndefined();
    expect(calls).toBe(BUCKET_SIZE);
  });
});

describe('bucketedLookup', () => {
  function lookupOf(list: WritableSignal<readonly Item[]>): (key: string) => string | undefined {
    return bucketedLookup(list, (item) => {
      const value = item.value();
      return value === null ? null : ([value, item.name] as const);
    });
  }

  it('resolves a key to the first item carrying it, across buckets', () => {
    const items = makeItems(BUCKET_SIZE * 3);
    const lookup = lookupOf(signal<readonly Item[]>(items));

    expect(lookup('a')).toBeUndefined();

    items[BUCKET_SIZE * 2]!.value.set('a');
    expect(lookup('a')).toBe(items[BUCKET_SIZE * 2]!.name);

    items[BUCKET_SIZE + 1]!.value.set('a');
    items[BUCKET_SIZE + 2]!.value.set('a');
    expect(lookup('a')).toBe(items[BUCKET_SIZE + 1]!.name);

    items[BUCKET_SIZE + 1]!.value.set('b');
    expect(lookup('a')).toBe(items[BUCKET_SIZE + 2]!.name);
    expect(lookup('b')).toBe(items[BUCKET_SIZE + 1]!.name);
  });

  it('skips an item whose entry is null', () => {
    const items = makeItems(3);
    items[0]!.value.set('a');
    const list = signal<readonly Item[]>(items);
    const lookup = lookupOf(list);

    expect(lookup('a')).toBe('item-0');
    items[0]!.value.set(null);
    expect(lookup('a')).toBeUndefined();
  });
});
