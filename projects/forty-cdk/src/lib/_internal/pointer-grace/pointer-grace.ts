import type { FloatingSide } from '../floating/floating';

/**
 * Pointer-grace ("safe triangle") helper.
 *
 * When a mouse leaves a submenu trigger heading toward the submenu content,
 * a naive "close on pointer-leave" would dismiss the submenu the moment the
 * cursor crosses the gap between the trigger and the content. Radix, Base UI,
 * and native desktop menus solve this with a *safe triangle*: a polygon drawn
 * from the cursor's exit point to the near edge of the submenu content. While
 * the pointer stays inside that polygon it is assumed to be travelling toward
 * the submenu, so the close is held off.
 *
 * This module keeps no Angular DI surface — the geometry is pure functions
 * (unit-tested in `pointer-grace.spec.ts`) and {@link attachPointerGrace} is a
 * plain `addEventListener` wrapper returning a cleanup, wired by the directive
 * through its `DestroyRef`. The DOM-measured inputs (cursor position, content
 * rect, resolved side) are supplied by the caller, so the geometry stays
 * testable without faking layout.
 */

/** A point in client (viewport) coordinates. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The subset of `DOMRect` the grace polygon needs. */
export interface GraceRect {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * Resolves which side a submenu actually rendered on by comparing the
 * geometry of the trigger and content rects, independent of any requested
 * placement. Picks the axis (horizontal vs vertical) with the larger
 * centre-to-centre separation, then the direction along it.
 *
 * This is the load-bearing fix for the safe-triangle: `injectFloating` only
 * writes the resolved `data-side` inside the async `computePosition().then()`,
 * so on the first hover-open it is still `undefined` and a `flip` near a
 * viewport edge would have armed the grace polygon toward the *requested*
 * side. Deriving the side from the live rects at arm time reflects the real
 * placement even before positioning settles.
 *
 * @param trigger Sub-trigger rect (client coords), from `getBoundingClientRect`.
 * @param content Submenu content rect (client coords), from `getBoundingClientRect`.
 */
export function resolveGraceSide(trigger: GraceRect, content: GraceRect): FloatingSide {
  const triggerCenterX = (trigger.left + trigger.right) / 2;
  const triggerCenterY = (trigger.top + trigger.bottom) / 2;
  const contentCenterX = (content.left + content.right) / 2;
  const contentCenterY = (content.top + content.bottom) / 2;
  const dx = contentCenterX - triggerCenterX;
  const dy = contentCenterY - triggerCenterY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

/** An ordered list of vertices describing a simple (non-self-intersecting) polygon. */
export type Polygon = readonly Point[];

/**
 * Pixels the cursor apex is pulled *back* (away from the content) when the
 * polygon is built, so the exit point sits reliably inside the polygon even
 * after sub-pixel rounding of the pointer-leave coordinates. Mirrors Radix's
 * `bleed` constant.
 */
const GRACE_BLEED_PX = 5;

/**
 * Standard even-odd ray-casting point-in-polygon test. Returns `true` when
 * {@link point} lies inside {@link polygon}. Points exactly on an edge are
 * reported inconsistently (as with any ray-cast) — that is acceptable here
 * because the bleed keeps the cursor apex strictly inside and the close path
 * is delay-guarded, so a single ambiguous edge sample never decides the
 * outcome.
 */
export function isPointInPolygon(point: Point, polygon: Polygon): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    const intersects =
      vi.y > point.y !== vj.y > point.y &&
      point.x < ((vj.x - vi.x) * (point.y - vi.y)) / (vj.y - vi.y) + vi.x;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Builds the safe-triangle polygon for a submenu opening on {@link side}.
 *
 * The polygon is a pentagon: the (bleeded) cursor apex plus the four corners
 * of the content rect, ordered so the cursor is adjacent to the two corners of
 * the content edge *nearest* the trigger. That shape covers both the triangle
 * the pointer travels through and the content itself, so the pointer is "in
 * the grace area" right up until it reaches the content.
 *
 * @param cursor Pointer position (client coords) captured at pointer-leave.
 * @param rect Submenu content rect (client coords), from `getBoundingClientRect`.
 * @param side Resolved side the content actually rendered on, from {@link resolveGraceSide}.
 */
export function buildSubmenuGracePolygon(
  cursor: Point,
  rect: GraceRect,
  side: FloatingSide,
): Polygon {
  const { top, right, bottom, left } = rect;
  switch (side) {
    // Content to the right; near edge = content's left edge.
    case 'right':
      return [
        { x: cursor.x - GRACE_BLEED_PX, y: cursor.y },
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ];
    // Content to the left; near edge = content's right edge.
    case 'left':
      return [
        { x: cursor.x + GRACE_BLEED_PX, y: cursor.y },
        { x: right, y: top },
        { x: left, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
      ];
    // Content below; near edge = content's top edge.
    case 'bottom':
      return [
        { x: cursor.x, y: cursor.y - GRACE_BLEED_PX },
        { x: left, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: right, y: top },
      ];
    // Content above; near edge = content's bottom edge.
    case 'top':
      return [
        { x: cursor.x, y: cursor.y + GRACE_BLEED_PX },
        { x: left, y: bottom },
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
      ];
  }
}

/**
 * Attaches a document-level `pointermove` listener that calls {@link onExit}
 * the first time the mouse leaves {@link polygon}. The caller arms this on a
 * trigger pointer-leave and disarms it (via the returned cleanup) once the
 * pointer reaches the content, the grace window elapses, or the submenu is
 * otherwise resolved.
 *
 * Touch / pen moves are ignored — the safe triangle models a hovering mouse;
 * touch interaction opens submenus by tap, never by hover.
 *
 * @returns A cleanup that removes the listener. Idempotent-safe to store and
 *   call once from a `DestroyRef` hook.
 */
export function attachPointerGrace(
  doc: Document,
  polygon: Polygon,
  onExit: () => void,
): () => void {
  const onMove = (event: PointerEvent): void => {
    if (event.pointerType !== '' && event.pointerType !== 'mouse') {
      return;
    }
    if (!isPointInPolygon({ x: event.clientX, y: event.clientY }, polygon)) {
      onExit();
    }
  };
  doc.addEventListener('pointermove', onMove);
  return () => doc.removeEventListener('pointermove', onMove);
}
