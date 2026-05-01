import {
  afterNextRender,
  effect,
  ElementRef,
  inject,
  Signal,
} from '@angular/core';
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  hide,
  type Middleware,
  offset,
  type Placement,
  shift,
} from '@floating-ui/dom';

import { injectPortal } from './portal';

const PLACEMENT_OPPOSITE: Record<'top' | 'right' | 'bottom' | 'left', string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

export interface FloatingConfig {
  /**
   * The anchor element. Reactive — should emit `null` until the reference
   * directive has registered itself, then the actual `HTMLElement`.
   * Positioning is skipped while `null`.
   */
  readonly reference: Signal<HTMLElement | null>;

  /**
   * Whether the floating element is currently visible. `autoUpdate` is
   * started when this becomes `true` and torn down when it goes back to
   * `false`, so consumers don't pay for positioning while closed.
   */
  readonly open: Signal<boolean>;

  /** Floating-ui placement (e.g. `'top'`, `'bottom-start'`). */
  readonly placement: Signal<Placement>;

  /** Distance (px) between reference and floating, forwarded to floating-ui's `offset` middleware. */
  readonly offset: Signal<number>;

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
   * Padding (px) handed to the `shift` middleware so the floating element
   * never crowds the viewport edge. Default `8`.
   */
  readonly shiftPadding?: number;
}

/**
 * Wires a floating UI element (tooltip, popover, menu...) to its anchor.
 * Must be called from an injection context. Pulls the `ElementRef` it lives
 * on as the floating element. Owns:
 *
 * 1. Optional portal — `appendChild` to `document.body` once mounted, `remove()`
 *    on `DestroyRef.onDestroy`.
 * 2. A reactive effect that subscribes to `open`/`reference`/`placement`/
 *    `offset`/`arrow` and runs `autoUpdate` while open, cleaning up via the
 *    effect's `onCleanup` when the deps change or the host destroys.
 * 3. Inside `autoUpdate`'s callback, calls `computePosition` and applies the
 *    resolved `transform`, `data-placement`, and `data-occluded` (when the
 *    `hide` middleware reports the reference is off-screen).
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

  const shiftPadding = config.shiftPadding ?? 8;

  effect((onCleanup) => {
    const isOpen = config.open();
    const reference = config.reference();
    const arrowEl = config.arrow?.() ?? null;
    const placement = config.placement();
    const offsetValue = config.offset();

    if (!isOpen || !reference) {
      return;
    }

    const middleware: Middleware[] = [
      offset(offsetValue),
      flip(),
      shift({ padding: shiftPadding }),
      hide(),
    ];
    if (arrowEl) {
      middleware.push(arrow({ element: arrowEl }));
    }

    const cleanup = autoUpdate(reference, el, () => {
      computePosition(reference, el, { placement, middleware }).then(
        ({ x, y, placement: resolvedPlacement, middlewareData }) => {
          // The element may have been hidden again between schedule and
          // resolution — bail so styles aren't clobbered after close.
          if (!config.open()) {
            return;
          }
          Object.assign(el.style, {
            transform: `translate(${Math.round(x)}px, ${Math.round(y)}px)`,
          });
          el.dataset['placement'] = resolvedPlacement;
          if (middlewareData.hide?.['referenceHidden']) {
            el.dataset['occluded'] = '';
          } else {
            delete el.dataset['occluded'];
          }
          if (arrowEl && middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow;
            const side = resolvedPlacement.split('-')[0] as
              | 'top'
              | 'right'
              | 'bottom'
              | 'left';
            const opposite = PLACEMENT_OPPOSITE[side];
            Object.assign(arrowEl.style, {
              position: 'absolute',
              left: ax != null ? `${ax}px` : '',
              top: ay != null ? `${ay}px` : '',
              right: '',
              bottom: '',
              [opposite]: '-4px',
            });
            arrowEl.dataset['placement'] = side;
          }
        },
      );
    });

    onCleanup(() => cleanup());
  });
}
