import { composedParentElement } from '../composed-tree/composed-tree';
import type { SwipeDirection } from './swipe-dismiss';

const EDGE_TOLERANCE_PX = 1;

function scrolls(overflow: string): boolean {
  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
}

/**
 * Returns true when `target` is inside a scrollable ancestor that has not
 * yet reached its edge along the gesture direction — meaning the gesture
 * should be left to scroll the inner content rather than starting a swipe
 * on the outer drawer. Stops walking at `boundary` (typically the drawer
 * root) so unrelated ancestors above it don't affect the decision; the walk
 * crosses open shadow boundaries.
 *
 * Direction semantics match {@link SwipeDirection}: `'down'` means a
 * pointer-travel-down gesture (which on a scrollable scrolls the content
 * up; we therefore care whether there is room above). Mirrored for the
 * other three, and the horizontal room is read in the scroller's own
 * writing direction.
 *
 * Conservative: an element with `overflow: hidden` is treated as
 * non-scrollable; an element within 1px of its edge along the gesture
 * direction returns `false` (i.e. the gesture is fair game for the swipe).
 */
export function isScrollableAtEdge(
  target: Element | null,
  direction: SwipeDirection,
  boundary?: Element | null,
): boolean {
  let cur: Element | null = target;
  while (cur && cur !== boundary) {
    if (cur instanceof HTMLElement && hasRoomAgainst(cur, direction)) {
      return true;
    }
    cur = composedParentElement(cur);
  }
  return false;
}

function hasRoomAgainst(el: HTMLElement, direction: SwipeDirection): boolean {
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  if (direction === 'up' || direction === 'down') {
    if (!scrolls(style?.overflowY ?? '') || el.scrollHeight <= el.clientHeight) {
      return false;
    }
    const room =
      direction === 'down' ? el.scrollTop : el.scrollHeight - el.clientHeight - el.scrollTop;
    return room > EDGE_TOLERANCE_PX;
  }
  if (!scrolls(style?.overflowX ?? '') || el.scrollWidth <= el.clientWidth) {
    return false;
  }
  const max = el.scrollWidth - el.clientWidth;
  const rtl = style?.direction === 'rtl';
  const roomLeft = rtl ? max + el.scrollLeft : el.scrollLeft;
  const roomRight = rtl ? -el.scrollLeft : max - el.scrollLeft;
  return (direction === 'right' ? roomLeft : roomRight) > EDGE_TOLERANCE_PX;
}
