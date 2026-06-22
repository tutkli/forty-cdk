/**
 * Live-region phrasing for `ForListboxReorder`. Framework-free and unit-testable in isolation.
 * Not part of the public API. Mirrors the lift / move / drop / cancel cadence the drag-drop and
 * tree coordinators use so a consumer hears consistent reorder announcements across primitives.
 */

/** Announcement when an option is lifted. `index` / `total` are 1-based. */
export function announceReorderLift(label: string, index: number, total: number): string {
  return `${label}, lifted. ${index} of ${total}.`;
}

/** Announcement when the drop position changes during a drag. `index` / `total` are 1-based. */
export function announceReorderMove(label: string, index: number, total: number): string {
  return `${label}, moved to position ${index} of ${total}.`;
}

/** Announcement on a committed drop. `index` / `total` are 1-based. */
export function announceReorderDrop(label: string, index: number, total: number): string {
  return `${label}, dropped at position ${index} of ${total}.`;
}

/** Announcement when a drag is cancelled. */
export function announceReorderCancel(label: string): string {
  return `${label}, movement cancelled.`;
}
