import { type Signal } from '@angular/core';
import {
  arrow,
  type ComputePositionReturn,
  flip,
  hide,
  type Middleware,
  offset,
  type Padding,
  type Placement,
  type ReferenceElement,
  shift,
  size,
} from '@floating-ui/dom';

import { runPositioning } from './run-positioning';

const PLACEMENT_OPPOSITE: Record<FloatingSide, FloatingSide> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

/** The four cardinal sides a floating element can be anchored to. */
export type FloatingSide = 'top' | 'right' | 'bottom' | 'left';

/** Alignment along the side axis: at the start edge, centered, or at the end edge. */
export type FloatingAlign = 'start' | 'center' | 'end';

export interface FloatingConfig {
  /**
   * The anchor. Either a real DOM element (e.g. a button trigger) or a
   * floating-ui `VirtualElement` (e.g. for context menus that anchor at the
   * pointer position). Reactive — should emit `null` until the anchor is
   * available; positioning is skipped while `null`.
   */
  readonly reference: Signal<ReferenceElement | null>;

  /**
   * Whether the floating element is currently visible. `autoUpdate` is
   * started when this becomes `true` and torn down when it goes back to
   * `false`, so consumers don't pay for positioning while closed.
   */
  readonly open: Signal<boolean>;

  /**
   * Side the floating element is anchored to (`'top'`/`'right'`/`'bottom'`/
   * `'left'`). When omitted (or the signal returns `undefined`), defaults
   * to `'bottom'`. Pair with `align` for the full positioning
   * API.
   */
  readonly side?: Signal<FloatingSide | undefined>;

  /**
   * Alignment along the chosen side. Defaults to `'center'`. With `side`
   * this composes the floating-ui placement (e.g. `side: 'bottom'` +
   * `align: 'start'` → placement `'bottom-start'`).
   */
  readonly align?: Signal<FloatingAlign | undefined>;

  /**
   * Distance (px) between reference and floating along the *main* axis
   * (perpendicular to `side`). Forwarded to floating-ui's `offset`
   * middleware. Defaults to `0`.
   */
  readonly sideOffset?: Signal<number | undefined>;

  /**
   * Distance (px) along the *cross* axis (parallel to `side`). Useful for
   * shifting an `align: 'start'` popover slightly past the trigger edge.
   */
  readonly alignOffset?: Signal<number | undefined>;

  /**
   * Optional arrow element. When non-null, the `arrow` middleware is
   * registered and the helper writes `position: absolute`, the resolved
   * `left` / `top` from floating-ui, and a side-aware
   * `var(--for-arrow-offset, 0px)` on the *opposite* axis once floating-ui
   * resolves a position. Consumers control how far the arrow pokes out of
   * the bubble by setting `--for-arrow-offset` (typically a negative `px`
   * value) on the arrow element or any ancestor — the helper ships no
   * default visual.
   */
  readonly arrow?: Signal<HTMLElement | null>;

  /**
   * When `true` (default), the floating element is moved to `document.body`
   * on first render and removed on destroy. Set to `false` to keep it in
   * its declared parent (rare — only for designs where positioning ancestors
   * are guaranteed safe).
   */
  readonly portal?: boolean;

  /**
   * When `true` (default), the `flip` and `shift` middlewares are active so
   * the floating element stays inside the viewport. Set to `false` to keep
   * the requested placement even when it overflows — useful for tooltips
   * inside scroll containers where the consumer wants strict positioning.
   */
  readonly avoidCollisions?: Signal<boolean>;

  /**
   * Padding (px or per-side rect) applied to both `flip` and `shift`. When
   * unset, `flip` uses padding 0 (legacy behavior) and `shift` uses
   * `shiftPadding` (default 8). Setting this overrides both uniformly.
   */
  readonly collisionPadding?: Signal<number | Padding>;

  /**
   * Boundary the collision middlewares (`flip`, `shift`, `size`) measure
   * against. Defaults to the viewport. Pass an element (or list) to keep
   * the floating element inside a scroll container.
   */
  readonly collisionBoundary?: Signal<Element | Element[] | null>;

  /** Padding (px) handed to the `arrow` middleware so the arrow stays inside the floating element's rounded corners. */
  readonly arrowPadding?: Signal<number>;

  /**
   * Stickiness behaviour for `shift`. `'partial'` (default behavior of
   * `shift`) lets the floating element shift to stay visible. `'always'`
   * disables `shift` so the floating element keeps its requested placement
   * even off-screen. `false` is equivalent to `'partial'`.
   */
  readonly sticky?: Signal<'partial' | 'always' | false>;

  /**
   * When `true`, sets `data-detached=""` on the host while the reference
   * element has scrolled off all clipping ancestors (`hide({ strategy:
   * 'escaped' })`). Lets consumers fade out tooltips/popovers tied to
   * scrolled-away triggers.
   */
  readonly hideWhenDetached?: Signal<boolean>;

  /**
   * When `true` (default / omitted), the floating element is clipped with
   * `clip-path: inset(50%)` until `@floating-ui/dom` resolves its first
   * position, so a short enter animation never flashes at the viewport
   * corner before placement lands. Set to `false` to paint from the first
   * frame — useful for a dramatic `animate.enter` that would otherwise lose
   * its opening frames while the async `computePosition` resolves, at the
   * cost of a possible first-frame flash at the pre-resolved position.
   */
  readonly clipUntilPositioned?: Signal<boolean>;

  /**
   * Invoked on the first resolved position of each positioning run — i.e.
   * after `@floating-ui/dom`'s async `computePosition` lands and the helper
   * drops the `clip-path` anti-flash baseline. A positioning run is an open
   * transition (or a positioner-config change while open); the callback fires
   * once per run and never while the surface stays closed.
   *
   * Because it runs strictly after the optional portal's `appendChild` and
   * after `computePosition` (so the `size` middleware's `max-height` is already
   * applied), it is the only moment a consumer can touch the now-portaled,
   * now-sized surface. Combobox uses it to scroll the active descendant into
   * view inside a `max-height`-constrained listbox whose `scrollTop` the portal
   * move reset to 0 — see `[forComboboxContent]`.
   */
  readonly onFirstPosition?: () => void;

  /**
   * Padding (px) handed to the `shift` middleware so the floating element
   * never crowds the viewport edge. Default `8`. Used as the fallback for
   * `collisionPadding` when that signal is not provided.
   */
  readonly shiftPadding?: number;
}

function joinPlacement(side: FloatingSide, align: FloatingAlign): Placement {
  return (align === 'center' ? side : `${side}-${align}`) as Placement;
}

function splitPlacement(p: Placement): { side: FloatingSide; align: FloatingAlign } {
  const [rawSide, rawAlign] = p.split('-') as [FloatingSide, 'start' | 'end' | undefined];
  return { side: rawSide, align: rawAlign ?? 'center' };
}

/**
 * Compute the CSS `transform-origin` so a CSS scale animates outward from
 * the anchor edge. With `side: 'bottom', align: 'start'` the origin is
 * `left top` — a `scale(0.95)` collapses toward the trigger's bottom-left
 * corner.
 */
function transformOriginFor(side: FloatingSide, align: FloatingAlign): string {
  let x: 'left' | 'right' | 'center';
  let y: 'top' | 'bottom' | 'center';
  if (side === 'top' || side === 'bottom') {
    y = side === 'top' ? 'bottom' : 'top';
    x = align === 'start' ? 'left' : align === 'end' ? 'right' : 'center';
  } else {
    x = side === 'left' ? 'right' : 'left';
    y = align === 'start' ? 'top' : align === 'end' ? 'bottom' : 'center';
  }
  return `${x} ${y}`;
}

/**
 * Wires a floating UI element (tooltip, popover, menu...) to its anchor.
 * Must be called from an injection context. Delegates the platform gate,
 * portal, anti-flash baseline, `autoUpdate` loop, and symmetric cleanup to
 * the shared {@link runPositioning} scaffold, and supplies the anchored
 * positioner's own per-run body: the `offset` / `flip` / `shift` / `size` /
 * `hide` / `arrow` middleware stack, plus the writes that follow each resolved
 * position — `data-placement`, `data-side`, `data-align`, `data-occluded`
 * (when the `hide` middleware reports the reference is off-screen),
 * `data-detached` (when `hideWhenDetached` is on and the reference escaped its
 * clipping ancestors), the `--for-anchor-width/-height`,
 * `--for-available-width/-height`, and `--for-content-transform-origin` CSS
 * variables, and the optional arrow's position + `--for-arrow-offset`.
 *
 * On the first resolved position of each run it invokes `onFirstPosition`
 * once — after the portal move and after `size` applied its `max-height`, so
 * a consumer can touch the now-portaled, now-sized surface.
 *
 * Cleanup is asymmetric on purpose: {@link resetFloatingStyles} strips the
 * transient sizing vars and occlusion attributes but retains the resolved
 * `translate` and placement outputs so a closing surface stays anchored to its
 * trigger through `animate.leave`; the next mount re-arms the baseline and
 * recomputes everything before painting.
 *
 * Stylistic concerns (which side gets the arrow offset via
 * `--for-arrow-offset`, pointer events, background, animations) stay with the
 * consumer.
 */
export function injectFloating(config: FloatingConfig): void {
  const fallbackShiftPadding = config.shiftPadding ?? 8;

  runPositioning({
    reference: config.reference,
    open: config.open,
    portal: config.portal,
    clipUntilPositioned: config.clipUntilPositioned,
    computeAndApply: (el, reference) => {
      const arrowEl = config.arrow?.() ?? null;

      let firstPositionResolved = false;

      // Resolve placement from `side` + `align` with sensible defaults.
      const sideInput = config.side?.() ?? 'bottom';
      const alignInput = config.align?.() ?? 'center';
      const requestedPlacement: Placement = joinPlacement(sideInput, alignInput);

      const sideOffsetVal = config.sideOffset?.() ?? 0;
      const alignOffsetVal = config.alignOffset?.() ?? 0;
      const avoidCollisions = config.avoidCollisions?.() ?? true;
      // `collisionPadding`, when set, applies uniformly to flip + shift +
      // size. When unset, preserve the historical defaults:
      // `flip` had no padding, `shift` had `shiftPadding ?? 8`.
      const collisionPaddingExplicit = config.collisionPadding?.();
      const flipPaddingValue = collisionPaddingExplicit ?? 0;
      const shiftPaddingValue = collisionPaddingExplicit ?? fallbackShiftPadding;
      const sizePaddingValue = collisionPaddingExplicit ?? fallbackShiftPadding;
      const collisionBoundary = config.collisionBoundary?.() ?? null;
      const arrowPaddingVal = config.arrowPadding?.() ?? 0;
      const stickyVal = config.sticky?.() ?? false;
      const hideOnDetach = config.hideWhenDetached?.() ?? false;

      const middleware: Middleware[] = [
        offset({ mainAxis: sideOffsetVal, crossAxis: alignOffsetVal }),
      ];

      if (avoidCollisions) {
        const flipOptions: Parameters<typeof flip>[0] = { padding: flipPaddingValue };
        if (collisionBoundary) flipOptions.boundary = collisionBoundary;
        middleware.push(flip(flipOptions));

        if (stickyVal !== 'always') {
          const shiftOptions: Parameters<typeof shift>[0] = { padding: shiftPaddingValue };
          if (collisionBoundary) shiftOptions.boundary = collisionBoundary;
          middleware.push(shift(shiftOptions));
        }
      }

      // `size` exposes available width/height as CSS variables so the
      // consumer can `max-height: var(--for-available-height)` etc.
      const sizeOptions: Parameters<typeof size>[0] = {
        padding: sizePaddingValue,
        apply({ availableWidth, availableHeight }) {
          el.style.setProperty(
            '--for-available-width',
            `${Math.max(0, Math.round(availableWidth))}px`,
          );
          el.style.setProperty(
            '--for-available-height',
            `${Math.max(0, Math.round(availableHeight))}px`,
          );
        },
      };
      if (collisionBoundary) sizeOptions.boundary = collisionBoundary;
      middleware.push(size(sizeOptions));

      middleware.push(hide({ strategy: 'referenceHidden' }));
      if (hideOnDetach) {
        middleware.push(hide({ strategy: 'escaped' }));
      }

      if (arrowEl) {
        middleware.push(arrow({ element: arrowEl, padding: arrowPaddingVal }));
      }

      return {
        placement: requestedPlacement,
        middleware,
        apply({ placement: resolvedPlacement, middlewareData }: ComputePositionReturn) {
          const { side: resolvedSide, align: resolvedAlign } = splitPlacement(
            resolvedPlacement as Placement,
          );

          el.dataset['placement'] = resolvedPlacement;
          el.dataset['side'] = resolvedSide;
          el.dataset['align'] = resolvedAlign;

          if (!firstPositionResolved) {
            firstPositionResolved = true;
            config.onFirstPosition?.();
          }

          // Anchor box → CSS vars so the consumer can size the floating
          // element relative to the anchor (`width: var(--for-anchor-width)`).
          // Both real `Element`s and floating-ui `VirtualElement`s expose
          // `getBoundingClientRect`, so the call is safe.
          const rect = reference.getBoundingClientRect();
          el.style.setProperty('--for-anchor-width', `${Math.round(rect.width)}px`);
          el.style.setProperty('--for-anchor-height', `${Math.round(rect.height)}px`);
          el.style.setProperty(
            '--for-content-transform-origin',
            transformOriginFor(resolvedSide, resolvedAlign),
          );

          // hide() with strategy 'referenceHidden' — anchor scrolled off-screen.
          if (middlewareData.hide?.['referenceHidden']) {
            el.dataset['occluded'] = '';
          } else {
            delete el.dataset['occluded'];
          }
          // hide() with strategy 'escaped' — only registered when
          // `hideWhenDetached` is on.
          if (hideOnDetach && middlewareData.hide?.['escaped']) {
            el.dataset['detached'] = '';
          } else {
            delete el.dataset['detached'];
          }

          if (arrowEl && middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow;
            const opposite = PLACEMENT_OPPOSITE[resolvedSide];
            Object.assign(arrowEl.style, {
              position: 'absolute',
              left: ax != null ? `${ax}px` : '',
              top: ay != null ? `${ay}px` : '',
              right: '',
              bottom: '',
              [opposite]: 'var(--for-arrow-offset, 0px)',
            });
            // `data-placement` on the arrow stores the *side* only, for
            // historical reasons (CSS like `[data-placement="top"]`).
            // `data-side` is the new canonical attribute; both stay in
            // sync until consumers migrate.
            arrowEl.dataset['placement'] = resolvedSide;
            arrowEl.dataset['side'] = resolvedSide;
          }
        },
        reset() {
          resetFloatingStyles(el);
          if (arrowEl) {
            resetArrowStyles(arrowEl);
          }
        },
      };
    },
  });
}

/**
 * Strip the transient sizing CSS custom properties, the occlusion `data-*`
 * attributes, and the `clip-path` hide baseline `injectFloating` writes to the
 * floating element. The resolved `translate` and the resolved-placement outputs
 * (`--for-content-transform-origin`, `data-placement`, `data-side`,
 * `data-align`) are intentionally retained so a closing surface stays anchored
 * to its trigger — and keeps pivoting its scale leave from the trigger edge —
 * through `animate.leave`; the next mount re-arms the `clip-path` baseline in
 * `afterNextRender` and recomputes all of them before painting, so a retained
 * value never produces a stale-position flash.
 */
function resetFloatingStyles(el: HTMLElement): void {
  // Clearing (not re-arming) the hide baseline keeps a closing surface
  // visible for its `animate.leave`; the next mount re-applies the
  // `clip-path` baseline in `afterNextRender`.
  el.style.removeProperty('clip-path');
  el.style.removeProperty('--for-anchor-width');
  el.style.removeProperty('--for-anchor-height');
  el.style.removeProperty('--for-available-width');
  el.style.removeProperty('--for-available-height');
  el.removeAttribute('data-occluded');
  el.removeAttribute('data-detached');
}

/**
 * Strip every inline style and `data-*` attribute `injectFloating` writes
 * to the optional arrow element. Mirrors `resetFloatingStyles`.
 */
function resetArrowStyles(arrowEl: HTMLElement): void {
  arrowEl.style.removeProperty('position');
  arrowEl.style.removeProperty('left');
  arrowEl.style.removeProperty('top');
  arrowEl.style.removeProperty('right');
  arrowEl.style.removeProperty('bottom');
  arrowEl.removeAttribute('data-placement');
  arrowEl.removeAttribute('data-side');
}
