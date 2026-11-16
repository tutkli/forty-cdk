import { arrow, type Middleware } from '@floating-ui/dom';

/**
 * Builds the middleware that positions an arrow element against its floating
 * surface, given the element and the padding (px) keeping it clear of the
 * surface's edges.
 */
export type FloatingArrowMiddleware = (element: HTMLElement, padding: number) => Middleware;

/**
 * The {@link FloatingArrowMiddleware} wrapping floating-ui's `arrow`. Passed as
 * `FloatingConfig.arrowMiddleware` by the positioners whose surface can render an
 * arrow, so a positioner that never does carries no reference to `arrow`.
 */
export const floatingArrowMiddleware: FloatingArrowMiddleware = (element, padding) =>
  arrow({ element, padding });
