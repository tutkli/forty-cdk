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

/**
 * Clamps a live-sort placeholder insertion index so it cannot cross a `dragDisabled`
 * (pinned) item. Each disabled host is a hard wall bounding the contiguous run of enabled
 * positions that contains `origin` — the gap the dragged item was lifted from — so the
 * placeholder stops at the first pinned item instead of travelling past it.
 *
 * Visual only: the committed drop index is resolved separately and is left unaffected. With
 * no disabled host the input index is returned unchanged (clamped to the valid range).
 *
 * @param index Raw insertion index resolved from pointer geometry (`0 .. disabled.length`).
 * @param disabled Disabled flag per non-lifted host, in DOM order.
 * @param origin Insertion index the dragged item was lifted from (its source gap).
 * @returns `index` clamped to the enabled run around `origin`.
 */
export function fencePlaceholderIndex(
  index: number,
  disabled: readonly boolean[],
  origin: number,
): number {
  let lower = 0;
  for (let i = origin - 1; i >= 0; i--) {
    if (disabled[i]) {
      lower = i + 1;
      break;
    }
  }
  let upper = disabled.length;
  for (let i = origin; i < disabled.length; i++) {
    if (disabled[i]) {
      upper = i;
      break;
    }
  }
  return Math.max(lower, Math.min(upper, index));
}
