/**
 * Edge from which the drawer enters the viewport. The active snap-point
 * dimension (height for top/bottom, width for left/right) is laid out
 * along the axis perpendicular to this edge.
 *
 * Declared in the core so the drawer-stack / drawer-scale coordinators can type
 * the side without importing up into a primitive entry point — the dependency
 * must flow `<primitive> → core`, never back.
 *
 * Part of the blessed core tier: consumers import it from `forty-cdk/drawer`,
 * which re-exports it through `drawer/drawer-context.ts`.
 */
export type ForDrawerSide = 'top' | 'right' | 'bottom' | 'left';
