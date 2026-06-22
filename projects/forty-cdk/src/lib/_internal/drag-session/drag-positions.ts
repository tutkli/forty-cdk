/** One reachable keyboard drop position: a container plus an insertion index within it. */
export interface DragSlot {
  /** Index into the ordered `[source, ...connected]` container list (0 = source). */
  readonly containerIndex: number;
  /** Insertion index within that container. */
  readonly index: number;
}

/**
 * Builds the flat, ordered sequence of reachable drop positions for a keyboard drag.
 * - The source container (index 0) contributes one slot per existing item
 *   (`0 .. sourceCount - 1`): the dragged item is *reinserted* among the current items, so
 *   the valid destination indices are exactly the existing positions.
 * - Each connected container contributes one slot per insertion gap (`0 .. count`,
 *   inclusive of the append position), since the item is *added* to it.
 * Order: all source slots, then each connected container's slots in `connectedCounts` order.
 */
export function buildDragSlots(
  sourceCount: number,
  connectedCounts: readonly number[],
): DragSlot[] {
  const slots: DragSlot[] = [];
  const clampedSource = Math.max(0, sourceCount);
  for (let i = 0; i < clampedSource; i++) {
    slots.push({ containerIndex: 0, index: i });
  }
  for (let ci = 0; ci < connectedCounts.length; ci++) {
    const count = Math.max(0, connectedCounts[ci]!);
    for (let i = 0; i <= count; i++) {
      slots.push({ containerIndex: ci + 1, index: i });
    }
  }
  return slots;
}

/** Flat-sequence position of `(containerIndex, index)`, or `-1` if not present. */
export function indexOfSlot(
  slots: readonly DragSlot[],
  containerIndex: number,
  index: number,
): number {
  return slots.findIndex((s) => s.containerIndex === containerIndex && s.index === index);
}

/** Steps `current` by `delta` (±1), clamped to `[0, slots.length - 1]` (no wrap). */
export function stepSlot(slots: readonly DragSlot[], current: number, delta: 1 | -1): number {
  if (slots.length === 0) {
    return current;
  }
  return Math.max(0, Math.min(slots.length - 1, current + delta));
}
