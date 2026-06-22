/**
 * Returns a copy of `array` with the item at `from` moved to `to`. Indices are clamped to
 * the array bounds; an out-of-range or no-op move returns a shallow copy unchanged.
 */
export function moveItemInArray<T>(array: readonly T[], from: number, to: number): T[] {
  const len = array.length;
  if (len === 0) {
    return [];
  }
  const clampedFrom = Math.max(0, Math.min(len - 1, from));
  const clampedTo = Math.max(0, Math.min(len - 1, to));
  const copy = [...array];
  if (clampedFrom === clampedTo) {
    return copy;
  }
  const [item] = copy.splice(clampedFrom, 1);
  copy.splice(clampedTo, 0, item!);
  return copy;
}

/**
 * Moves the item at `fromIndex` of `from` into `to` at `toIndex`, returning new arrays for
 * both. Does not mutate the inputs. Indices are clamped (`toIndex` may equal `to.length`,
 * i.e. append).
 */
export function transferArrayItem<T>(
  from: readonly T[],
  to: readonly T[],
  fromIndex: number,
  toIndex: number,
): { from: T[]; to: T[] } {
  if (from.length === 0) {
    return { from: [], to: [...to] };
  }
  const clampedFrom = Math.max(0, Math.min(from.length - 1, fromIndex));
  const clampedTo = Math.max(0, Math.min(to.length, toIndex));
  const nextFrom = [...from];
  const [item] = nextFrom.splice(clampedFrom, 1);
  const nextTo = [...to];
  nextTo.splice(clampedTo, 0, item!);
  return { from: nextFrom, to: nextTo };
}
