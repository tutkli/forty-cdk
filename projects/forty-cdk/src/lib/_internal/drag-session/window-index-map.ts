/** Previous and new absolute (dataset) index of a reordered windowed row. */
export interface WindowReorderResult {
  /** Previous absolute (dataset) index of the lifted row (0-based). */
  readonly from: number;
  /** New absolute (dataset) index the lifted row moves to (0-based). */
  readonly to: number;
}

/**
 * Absolute index of `value` once the lifted row at `from` has been removed from
 * the dataset: every index above `from` shifts down by one to close the gap the
 * removal opened. The single post-removal shift both insertion branches of
 * {@link translateWindowReorder} share, so the `> from ? 1 : 0` surgery lives in
 * one place rather than being re-derived per branch (the off-by-one shape behind
 * the #808 `gapIndex` overflow).
 */
function indexAfterRemoval(value: number, from: number): number {
  return value - (value > from ? 1 : 0);
}

/**
 * Translates a windowed list's window-relative `previousIndex` / `currentIndex`
 * into absolute dataset indices, so a virtualized list's consumer can apply
 * `moveItemInArray` over the **full** array. `windowIndices` holds the absolute
 * index of every rendered draggable row, in DOM (ascending) order — its length
 * is the rendered window size; `previousIndex` is the lifted row's position in
 * that window and `currentIndex` the resolved insertion index (post-removal
 * space, `0..windowIndices.length - 1`). Reduces to the identity when the window
 * spans the whole dataset, so a non-virtualized list is unaffected.
 */
export function translateWindowReorder(
  windowIndices: readonly number[],
  previousIndex: number,
  currentIndex: number,
): WindowReorderResult {
  const from = windowIndices[previousIndex] ?? previousIndex;
  const rest = windowIndices.filter((_, i) => i !== previousIndex);
  if (currentIndex >= rest.length) {
    const last = rest[rest.length - 1];
    if (last === undefined) {
      return { from, to: from };
    }
    return { from, to: indexAfterRemoval(last + 1, from) };
  }
  const target = rest[currentIndex]!;
  return { from, to: indexAfterRemoval(target, from) };
}
