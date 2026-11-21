import { computed, type Signal } from '@angular/core';

/** Items per bucket: each bucket re-scans at most this many items when one of them changes. */
export const BUCKET_SIZE = 32;

function sameEntries<K, V>(a: ReadonlyMap<K, V>, b: ReadonlyMap<K, V>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const [key, value] of a) {
    if (!b.has(key) || !Object.is(b.get(key), value)) {
      return false;
    }
  }
  return true;
}

function buckets<H, R>(
  items: Signal<readonly H[]>,
  fold: (list: readonly H[], start: number, end: number) => R,
  equal?: (a: R, b: R) => boolean,
): Signal<readonly Signal<R>[]> {
  return computed(() => {
    const list = items();
    const result: Signal<R>[] = [];
    for (let start = 0; start < list.length; start += BUCKET_SIZE) {
      const end = Math.min(start + BUCKET_SIZE, list.length);
      result.push(computed(() => fold(list, start, end), equal ? { equal } : undefined));
    }
    return result;
  });
}

/**
 * The first item of `items` for which `match` returns `true`, or `undefined`.
 *
 * Equivalent to `computed(() => items().find(match))`, except that the scan is
 * split into fixed-size buckets, each memoized over its own slice. A signal
 * `match` reads on one item then re-runs that item's bucket and the scan over
 * the bucket results, not the whole list, so N items whose per-item state is
 * written one by one (a `@for` mount writing each row's `[value]`) cost
 * O(N · (bucket + N / bucket)) instead of O(N²). The buckets are rebuilt only
 * when `items` itself changes.
 *
 * Internal core tier — refactorable without notice, with no semver guarantee.
 */
export function bucketedFind<H>(
  items: Signal<readonly H[]>,
  match: (item: H) => boolean,
): Signal<H | undefined> {
  const slices = buckets(items, (list, start, end) => {
    for (let i = start; i < end; i++) {
      const item = list[i]!;
      if (match(item)) {
        return item;
      }
    }
    return undefined;
  });
  return computed(() => {
    for (const bucket of slices()) {
      const found = bucket();
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  });
}

/**
 * A lookup from a key to the value of the first item of `items` that `entry`
 * maps to that key. `entry` returns `null` for an item that contributes no key.
 *
 * Built on the same buckets as {@link bucketedFind}: each bucket holds the map of
 * its own slice, so a signal `entry` reads on one item rebuilds that bucket's
 * entries only. A call reads the buckets in order up to the first one holding
 * the key, so a reactive caller depends on those buckets and on none after.
 *
 * Internal core tier — refactorable without notice, with no semver guarantee.
 */
export function bucketedLookup<H, K, V>(
  items: Signal<readonly H[]>,
  entry: (item: H) => readonly [K, V] | null,
): (key: K) => V | undefined {
  const slices = buckets(
    items,
    (list, start, end) => {
      const map = new Map<K, V>();
      for (let i = start; i < end; i++) {
        const pair = entry(list[i]!);
        if (pair !== null && !map.has(pair[0])) {
          map.set(pair[0], pair[1]);
        }
      }
      return map as ReadonlyMap<K, V>;
    },
    sameEntries,
  );
  return (key) => {
    for (const bucket of slices()) {
      const map = bucket();
      if (map.has(key)) {
        return map.get(key);
      }
    }
    return undefined;
  };
}
