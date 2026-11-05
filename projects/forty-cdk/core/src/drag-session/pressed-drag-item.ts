/** A registered element a press can land in: a drag item, a table row. */
export interface PressTarget {
  readonly host: HTMLElement;
}

/** The part of a registered drag item {@link resolvePressedDragItem} reads. */
export interface PressableDragItem extends PressTarget {
  /** Whether the item cannot be lifted. */
  disabled(): boolean;
  /**
   * Whether a pointer press on `target` may start a drag of this item: `false` for a press inside
   * a draggable nested in it, or outside its drag handles when it has any. Has no side effects.
   */
  acceptsPointerStart(target: EventTarget | null): boolean;
}

/**
 * The entry of `items` whose `host` is `target` or contains it, else `null`. When several do, the
 * innermost wins. Resolves through the registered hosts rather than a selector attribute, so a
 * host that received its directive through `hostDirectives` or a subclass is found like any other.
 */
export function findPressedDragItem<T extends PressTarget>(
  items: readonly T[],
  target: EventTarget | null,
): T | null {
  if (!(target instanceof Node)) {
    return null;
  }
  let pressed: T | null = null;
  for (const item of items) {
    if (item.host.contains(target) && (pressed === null || pressed.host.contains(item.host))) {
      pressed = item;
    }
  }
  return pressed;
}

/**
 * The drag item a pointer press on `target` would start a drag of: the entry of `items` that
 * {@link findPressedDragItem} resolves, provided it is enabled and accepts a pointer start from
 * `target` (see {@link PressableDragItem.acceptsPointerStart}). `null` otherwise, so a coordinator
 * arms nothing for a press its item's own guard refuses.
 */
export function resolvePressedDragItem<T extends PressableDragItem>(
  items: readonly T[],
  target: EventTarget | null,
): T | null {
  const pressed = findPressedDragItem(items, target);
  if (pressed === null || pressed.disabled() || !pressed.acceptsPointerStart(target)) {
    return null;
  }
  return pressed;
}
