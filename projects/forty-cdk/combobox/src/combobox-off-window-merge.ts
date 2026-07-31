import type { LabelCacheEntry } from 'forty-cdk/core';

/**
 * Overlay the virtualized position snapshot onto the label cache's window
 * entries, so inline autocomplete keeps matching options scrolled out of view.
 *
 * The label cache holds one window at a time, while the navigator's position map
 * accumulates every position it has folded (bounded by `totalCount`, purged on a
 * dataset rebuild). Window entries take precedence — they are the freshest read —
 * and off-window entries follow, sorted by absolute position so a completion walk
 * meets them in list order. De-duplication is by serialized form value, not by
 * `id`: an option that unmounts and remounts under a new id but the same value is
 * one option.
 *
 * Pass an empty map (the non-virtualized case) to get `entries` back unchanged.
 *
 * Internal — not re-exported from `combobox/public-api.ts`.
 */
export function mergeOffWindowEntries<T>(
  entries: readonly LabelCacheEntry<T>[],
  indexed: ReadonlyMap<number, LabelCacheEntry<T>>,
  toFormValue: (item: T) => string,
): readonly LabelCacheEntry<T>[] {
  if (indexed.size === 0) {
    return entries;
  }
  const seen = new Set(entries.map((entry) => toFormValue(entry.value)));
  const merged: LabelCacheEntry<T>[] = [...entries];
  for (const pos of [...indexed.keys()].sort((a, b) => a - b)) {
    const entry = indexed.get(pos)!;
    const key = toFormValue(entry.value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(entry);
  }
  return merged;
}
