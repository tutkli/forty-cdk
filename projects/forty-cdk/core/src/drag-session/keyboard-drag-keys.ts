import { isImeComposing } from '../keyboard-navigation/ime-composition';

/**
 * Shared keyboard resolvers for container-level drag-reorder coordinators
 * (`ForTreeNodeDrag`, `ForListboxReorder`, `ForTableRowReorder`). Framework-free
 * and unit-testable in isolation. Not part of the public API.
 *
 * A coordinator that lives next to a roving / selectable collection cannot reuse
 * the plain Space / Enter lift the drag-drop primitive uses on a `[forDraggable]`
 * item — those keys already activate / select the focused item. The convention
 * across these coordinators is therefore a dedicated **lift binding**, read from
 * `ForDragDropDefaults.liftKey` so a consumer can rebind it per scope, plus a
 * shared commit / cancel vocabulary while a node is lifted.
 */

/**
 * Whether a key press lifts the focused item into a keyboard drag: the scope's
 * `liftKey` binding accepts it and it does not belong to an IME composition.
 *
 * @param event The keydown fired while no item is lifted.
 * @param liftKey The resolved `ForDragDropDefaults.liftKey` of the coordinator's scope.
 */
export function isDragLiftKey(
  event: KeyboardEvent,
  liftKey: (event: KeyboardEvent) => boolean,
): boolean {
  return !isImeComposing(event) && liftKey(event);
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
  if ((event.key === 'Escape' && !isImeComposing(event)) || event.key === 'Tab') {
    return 'cancel';
  }
  if (event.key === ' ' || event.key === 'Enter') {
    return 'commit';
  }
  return null;
}
