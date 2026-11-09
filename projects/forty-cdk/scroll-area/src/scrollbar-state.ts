import type { ForScrollAreaContext, ForScrollbarOrientation } from './scroll-area-context';

/** Whether `orientation` overflows the viewport by more than a 1px rounding slack. */
export function axisOverflows(
  ctx: ForScrollAreaContext,
  orientation: ForScrollbarOrientation,
): boolean {
  if (orientation === 'horizontal') {
    return ctx.scrollWidth() - ctx.clientWidth() > 1;
  }
  return ctx.scrollHeight() - ctx.clientHeight() > 1;
}

/**
 * The `data-state` one axis's scrollbar resolves to. `pinned` is an in-flight
 * thumb drag or track press on that axis, which forces `'visible'`. Otherwise
 * `'always'` is `'visible'` regardless of overflow, `'auto'` follows overflow,
 * and `'hover'` / `'scroll'` additionally gate on the root's interaction signals.
 */
export function resolveScrollbarState(
  ctx: ForScrollAreaContext,
  orientation: ForScrollbarOrientation,
  pinned: boolean,
): 'visible' | 'hidden' {
  if (pinned) return 'visible';
  switch (ctx.type()) {
    case 'always':
      return 'visible';
    case 'auto':
      return axisOverflows(ctx, orientation) ? 'visible' : 'hidden';
    case 'hover':
      return axisOverflows(ctx, orientation) && (ctx.hovering() || ctx.scrolling())
        ? 'visible'
        : 'hidden';
    case 'scroll':
      return axisOverflows(ctx, orientation) && ctx.scrolling() ? 'visible' : 'hidden';
  }
}
