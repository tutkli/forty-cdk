/** Where to insert the live-sort placeholder: a parent node and the node to insert before. */
export interface PlaceholderInsertion {
  /** The DOM node the placeholder's nodes should be inserted into. */
  readonly parent: Node;
  /** The reference node to insert before; `null` means append to `parent`. */
  readonly ref: Node | null;
}

/**
 * Computes the DOM insertion point for the live-sort placeholder.
 *
 * @param hosts The target container's non-lifted item host elements, in DOM order.
 * @param index Insertion index within `hosts` (`0 .. hosts.length`, inclusive of append).
 * @param container Fallback parent used when the container has no items.
 * @returns The `parent` node and the `ref` node to insert before (`null` = append).
 */
export function placeholderInsertion(
  hosts: readonly HTMLElement[],
  index: number,
  container: HTMLElement,
): PlaceholderInsertion {
  if (index < hosts.length) {
    const at = hosts[index]!;
    return { parent: at.parentNode ?? container, ref: at };
  }
  const last = hosts[hosts.length - 1];
  if (last) {
    return { parent: last.parentNode ?? container, ref: last.nextSibling };
  }
  return { parent: container, ref: null };
}
