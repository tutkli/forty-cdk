/**
 * Edge from which the drawer enters the viewport. The active snap-point
 * dimension (height for top/bottom, width for left/right) is laid out
 * along the axis perpendicular to this edge.
 *
 * Lives in `_internal/` so the drawer-stack / drawer-scale coordinators can
 * type the side without importing up into `lib/drawer` — the dependency must
 * flow `lib → _internal`, never back. Re-exported from
 * `drawer/drawer-context.ts` as the public `ForDrawerSide` so consumers keep
 * their existing import path.
 *
 * Internal — not re-exported from `public-api.ts`.
 */
export type ForDrawerSide = 'top' | 'right' | 'bottom' | 'left';
