/**
 * Keyboard interaction resolvers for `ForTreeNodeDrag`. Framework-free and unit-testable in
 * isolation. Not part of the public API.
 */

/** The action a key press maps to while a node is lifted (keyboard drag in progress). */
export type TreeDragLiftedAction = 'cancel' | 'commit' | 'down' | 'up' | 'deepen' | 'shallow';

/**
 * Whether a key press is the "lift" chord (Ctrl+Space or Cmd+Space) used to pick up the
 * focused node and start a keyboard drag.
 */
export function isTreeDragLiftKey(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key === ' ';
}

/**
 * Resolves the action for a key press while a node is lifted, honoring writing direction for
 * the depth keys (ArrowRight deepens in LTR, ArrowLeft deepens in RTL). Returns `null` for
 * keys with no lifted-drag meaning.
 *
 * @param event The keydown event.
 * @param dir Resolved writing direction.
 */
export function resolveTreeDragLiftedAction(
  event: KeyboardEvent,
  dir: 'ltr' | 'rtl',
): TreeDragLiftedAction | null {
  const key = event.key;
  if (key === 'Escape' || key === 'Tab') {
    return 'cancel';
  }
  if (key === ' ' || key === 'Enter') {
    return 'commit';
  }
  if (key === 'ArrowDown') {
    return 'down';
  }
  if (key === 'ArrowUp') {
    return 'up';
  }
  const isRtl = dir === 'rtl';
  if (key === (isRtl ? 'ArrowLeft' : 'ArrowRight')) {
    return 'deepen';
  }
  if (key === (isRtl ? 'ArrowRight' : 'ArrowLeft')) {
    return 'shallow';
  }
  return null;
}
