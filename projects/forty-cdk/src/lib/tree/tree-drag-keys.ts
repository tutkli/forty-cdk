import { resolveLiftedDragControl } from 'forty-cdk/core';

/**
 * Tree-specific keyboard resolver for `ForTreeNodeDrag`. Framework-free and unit-testable in
 * isolation. Not part of the public API. The lift chord (`isDragLiftKey`) and the commit / cancel
 * vocabulary are shared across reorder coordinators in `_internal/drag-session/keyboard-drag-keys`.
 */

/** The action a key press maps to while a node is lifted (keyboard drag in progress). */
export type TreeDragLiftedAction = 'cancel' | 'commit' | 'down' | 'up' | 'deepen' | 'shallow';

/**
 * Resolves the action for a key press while a node is lifted, honoring writing direction for
 * the depth keys (ArrowRight deepens in LTR, ArrowLeft deepens in RTL). Cancel / commit are
 * delegated to the shared {@link resolveLiftedDragControl}. Returns `null` for keys with no
 * lifted-drag meaning.
 *
 * @param event The keydown event.
 * @param dir Resolved writing direction.
 */
export function resolveTreeDragLiftedAction(
  event: KeyboardEvent,
  dir: 'ltr' | 'rtl',
): TreeDragLiftedAction | null {
  const control = resolveLiftedDragControl(event);
  if (control) {
    return control;
  }
  const key = event.key;
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
