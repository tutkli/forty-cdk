import type {
  FloatingAlign,
  FloatingFallbackAxisSideDirection,
  FloatingSide,
} from '../floating/floating';

/**
 * Single source of truth for the floating-ui positioning defaults shared by the
 * three menu roots — `[forDropdownMenu]`, `[forContextMenu]`, and `[forMenuSub]`.
 *
 * Angular's compiler requires every `input()` to be declared directly in a class
 * member initializer (NG8110), so the inputs themselves can't be produced by a
 * shared factory. To stop the (already-drifted) defaults from diverging again,
 * each root reads its non-seed defaults from this object and the
 * `menu-positioning-inputs.spec.ts` guard asserts the three roots keep an
 * identical positioning input set.
 *
 * Only `side` / `sideOffset` / `collisionPadding` legitimately vary per root:
 *
 * - `side` — DropdownMenu / ContextMenu anchor `'bottom'`; the submenu resolves
 *   its side from the writing direction (`'right'` LTR / `'left'` RTL).
 * - `sideOffset` / `collisionPadding` — seeded from each root's defaults
 *   provider (`provideForDropdownMenuDefaults` / `provideForContextMenuDefaults`
 *   / `provideForMenuDefaults`) so a scope override flows through.
 *
 * Everything below is identical across all three roots.
 */
export const MENU_POSITIONING_DEFAULTS = {
  /** Default anchor side for the two top-level roots. */
  side: 'bottom' as FloatingSide | undefined,
  /** Default alignment along the chosen `side`. */
  align: 'start' as FloatingAlign | undefined,
  /** Default gap (px) along the cross axis. */
  alignOffset: 0,
  /** `flip` / `shift` keep the surface inside the viewport by default. */
  avoidCollisions: true,
  /** `flip` tries only the opposite same-axis placement by default (no perpendicular-axis fallback). */
  fallbackAxisSideDirection: 'none' as FloatingFallbackAxisSideDirection,
  /** Default padding (px) for the `arrow` middleware. */
  arrowPadding: 0,
  /** Default stickiness behaviour for `shift`. */
  sticky: 'partial' as 'partial' | 'always' | false,
  /** `data-detached=""` is not reflected by default. */
  hideWhenDetached: false,
  /** Content is clipped until floating-ui resolves its first position by default. */
  clipUntilPositioned: true,
} as const;
