import { afterNextRender, effect, ElementRef, inject, Signal } from '@angular/core';
import {
  arrow,
  autoUpdate,
  computePosition,
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

import { injectPortal } from '../portal/portal';

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
   * `'left'`). When omitted (or the signal returns `undefined`), falls
   * back to the side parsed from `placement`. Pair with `align` for the
   * full Radix-style positioning API.
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
   * middleware. Falls back to `offset` for backward compatibility.
   */
  readonly sideOffset?: Signal<number | undefined>;

  /**
   * Distance (px) along the *cross* axis (parallel to `side`). Useful for
   * shifting an `align: 'start'` popover slightly past the trigger edge.
   */
  readonly alignOffset?: Signal<number | undefined>;

  /**
   * Legacy floating-ui placement string (e.g. `'top'`, `'bottom-start'`).
   * Used when `side` is not provided. New code should prefer the
   * `side` + `align` pair.
   */
  readonly placement?: Signal<Placement>;

  /**
   * Legacy alias for `sideOffset`. Kept for backward compatibility with
   * primitives that still expose a single `offset` input.
   */
  readonly offset?: Signal<number>;

  /**
   * Optional arrow element. When non-null, the `arrow` middleware is
   * registered and the helper writes `position: absolute` plus `left`/`top`
   * (and a side-aware `-4px` offset on the opposite axis) on the arrow once
   * floating-ui resolves a position.
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
   * `shiftPadding` (default 8). Setting this overrides both uniformly,
   * matching Radix's `collisionPadding` semantics.
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
 * Must be called from an injection context. Pulls the `ElementRef` it lives
 * on as the floating element. Owns:
 *
 * 1. Optional portal — `appendChild` to `document.body` once mounted, `remove()`
 *    on `DestroyRef.onDestroy`.
 * 2. A reactive effect that subscribes to `open`/`reference`/`placement`/
 *    offsets/arrow and runs `autoUpdate` while open, cleaning up via the
 *    effect's `onCleanup` when the deps change or the host destroys.
 * 3. Inside `autoUpdate`'s callback, calls `computePosition` and applies the
 *    resolved `transform`, `data-placement`, `data-side`, `data-align`,
 *    `data-occluded` (when the `hide` middleware reports the reference
 *    is off-screen), and CSS variables (`--for-anchor-width/-height`,
 *    `--for-available-width/-height`, `--for-content-transform-origin`).
 *
 * Stylistic concerns (which side gets the arrow offset, pointer events,
 * background, animations) stay with the consumer.
 */
export function injectFloating(config: FloatingConfig): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const el = host.nativeElement;

  if (config.portal !== false) {
    injectPortal();
  }

  afterNextRender(() => {
    // Baseline styles required for transform-based positioning. Set
    // imperatively so consumer host bindings don't have to remember.
    Object.assign(el.style, {
      position: 'fixed',
      left: '0',
      top: '0',
    });
  });

  const fallbackShiftPadding = config.shiftPadding ?? 8;

  effect((onCleanup) => {
    const isOpen = config.open();
    const reference = config.reference();
    const arrowEl = config.arrow?.() ?? null;

    // Resolve placement — `side` + `align` win over the legacy `placement`.
    const sideInput = config.side?.();
    const alignInput = config.align?.();
    const legacyPlacement = config.placement?.() ?? 'bottom';
    const requestedPlacement: Placement = sideInput
      ? joinPlacement(sideInput, alignInput ?? 'center')
      : legacyPlacement;

    const sideOffsetVal = config.sideOffset?.() ?? config.offset?.() ?? 0;
    const alignOffsetVal = config.alignOffset?.() ?? 0;
    const avoidCollisions = config.avoidCollisions?.() ?? true;
    // `collisionPadding`, when set, applies uniformly to flip + shift +
    // size (matches Radix). When unset, preserve the historical defaults:
    // `flip` had no padding, `shift` had `shiftPadding ?? 8`.
    const collisionPaddingExplicit = config.collisionPadding?.();
    const flipPaddingValue = collisionPaddingExplicit ?? 0;
    const shiftPaddingValue = collisionPaddingExplicit ?? fallbackShiftPadding;
    const sizePaddingValue = collisionPaddingExplicit ?? fallbackShiftPadding;
    const collisionBoundary = config.collisionBoundary?.() ?? null;
    const arrowPaddingVal = config.arrowPadding?.() ?? 0;
    const stickyVal = config.sticky?.() ?? false;
    const hideOnDetach = config.hideWhenDetached?.() ?? false;

    if (!isOpen || !reference) {
      return;
    }

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

    const cleanup = autoUpdate(reference, el, () => {
      computePosition(reference, el, { placement: requestedPlacement, middleware }).then(
        ({ x, y, placement: resolvedPlacement, middlewareData }) => {
          // The element may have been hidden again between schedule and
          // resolution — bail so styles aren't clobbered after close.
          if (!config.open()) {
            return;
          }

          const { side: resolvedSide, align: resolvedAlign } = splitPlacement(
            resolvedPlacement as Placement,
          );

          Object.assign(el.style, {
            transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
          });
          el.dataset['placement'] = resolvedPlacement;
          el.dataset['side'] = resolvedSide;
          el.dataset['align'] = resolvedAlign;

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
              [opposite]: '-4px',
            });
            // `data-placement` on the arrow stores the *side* only, for
            // historical reasons (CSS like `[data-placement="top"]`).
            // `data-side` is the new canonical attribute; both stay in
            // sync until consumers migrate.
            arrowEl.dataset['placement'] = resolvedSide;
            arrowEl.dataset['side'] = resolvedSide;
          }
        },
      );
    });

    onCleanup(() => cleanup());
  });
}
