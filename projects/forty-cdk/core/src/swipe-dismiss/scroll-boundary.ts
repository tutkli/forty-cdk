import type { SwipeDirection } from './swipe-dismiss';

/**
 * Returns true when `target` is inside a scrollable ancestor that has not
 * yet reached its edge along the gesture direction — meaning the gesture
 * should be left to scroll the inner content rather than starting a swipe
 * on the outer drawer. Stops walking at `boundary` (typically the drawer
 * root) so unrelated ancestors above it don't affect the decision.
 *
 * Direction semantics match {@link SwipeDirection}: `'down'` means a
 * pointer-travel-down gesture (which on a scrollable scrolls the content
 * up; we therefore care whether `scrollTop > 0`). Mirrored for the other
 * three.
 *
 * Conservative: an element with `overflow: hidden` is treated as
 * non-scrollable; an element scrolled to the edge along the gesture
 * direction returns `false` (i.e. the gesture is fair game for the swipe).
 */
export function isScrollableAtEdge(
  target: Element | null,
  direction: SwipeDirection,
  boundary?: Element | null,
): boolean {
  let cur: Element | null = target;
  while (cur && cur !== boundary) {
    if (!(cur instanceof HTMLElement)) {
      cur = cur.parentElement;
      continue;
    }
    const style = cur.ownerDocument.defaultView?.getComputedStyle(cur);
    const overflowX = style?.overflowX ?? '';
    const overflowY = style?.overflowY ?? '';

    const isVerticalScrollable =
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      cur.scrollHeight > cur.clientHeight;
    const isHorizontalScrollable =
      (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
      cur.scrollWidth > cur.clientWidth;

    switch (direction) {
      case 'down':
        // Pointer moves down → scrollable container would be scrolled up.
        // Has further content to scroll up if scrollTop > 0.
        if (isVerticalScrollable && cur.scrollTop > 0) {
          return true;
        }
        break;
      case 'up':
        if (isVerticalScrollable && cur.scrollTop + cur.clientHeight < cur.scrollHeight) {
          return true;
        }
        break;
      case 'right':
        if (isHorizontalScrollable && cur.scrollLeft > 0) {
          return true;
        }
        break;
      case 'left':
        if (isHorizontalScrollable && cur.scrollLeft + cur.clientWidth < cur.scrollWidth) {
          return true;
        }
        break;
    }
    cur = cur.parentElement;
  }
  return false;
}
