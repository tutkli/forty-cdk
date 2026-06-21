/**
 * Screen-reader announcement strings for `ForTreeNodeDrag`. Kept framework-free and
 * separate from the directive so the live-region copy lives in one place and can be unit
 * tested without rendering the tree. Not part of the public API.
 */

/** Spoken when a node is picked up (assertive). */
export function announceTreeLift(label: string): string {
  return `Picked up ${label}. Use arrow keys to move, Space to drop, Escape to cancel.`;
}

/** Spoken on each intermediate move while a node is lifted (polite). */
export function announceTreeMove(
  label: string,
  parentLabel: string | null,
  position: number,
  total: number,
): string {
  const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
  return `${label}: ${parentPart}position ${position} of ${total}.`;
}

/** Spoken when a node is committed to its new position (assertive). */
export function announceTreeDrop(
  label: string,
  parentLabel: string | null,
  position: number,
  total: number,
): string {
  const parentPart = parentLabel ? `under ${parentLabel}, ` : 'at root, ';
  return `Dropped ${label} ${parentPart}position ${position} of ${total}.`;
}

/** Spoken when a lift is cancelled and the node returns to its origin (assertive). */
export function announceTreeCancel(label: string): string {
  return `Cancelled. ${label} returned to its original position.`;
}

/** Spoken when a `canDrop` veto rejects the attempted drop (assertive). */
export function announceTreeInvalid(label: string): string {
  return `Cannot drop ${label} here.`;
}
