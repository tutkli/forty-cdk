/**
 * Shared keyboard resolvers for container-level drag-reorder coordinators
 * (`ForTreeNodeDrag`, `ForListboxReorder`). Framework-free and unit-testable in
 * isolation. Not part of the public API.
 *
 * A coordinator that lives next to a roving / selectable collection cannot reuse
 * the plain Space / Enter lift the drag-drop primitive uses on a `[forDraggable]`
 * item — those keys already activate / select the focused item. The convention
 * across these coordinators is therefore a dedicated **lift chord**
 * (`Ctrl/Cmd+Space`) that never collides with native activation, plus a shared
 * commit / cancel vocabulary while a node is lifted.
 */

/**
 * Whether a key press is the "lift" chord (`Ctrl+Space` or `Cmd+Space`) used to
 * pick up the focused item and start a keyboard drag.
 */
export function isDragLiftKey(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key === ' ';
}

/**
 * Resolves the commit / cancel control common to every lifted keyboard drag:
 * `Escape` / `Tab` cancel, `Space` / `Enter` commit. Returns `null` for keys
 * with no control meaning, leaving the caller to resolve its own movement keys
 * (sibling steps, depth changes, etc.).
 *
 * @param event The keydown event fired while an item is lifted.
 */
export function resolveLiftedDragControl(event: KeyboardEvent): 'cancel' | 'commit' | null {
  if (event.key === 'Escape' || event.key === 'Tab') {
    return 'cancel';
  }
  if (event.key === ' ' || event.key === 'Enter') {
    return 'commit';
  }
  return null;
}
