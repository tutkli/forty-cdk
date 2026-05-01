import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
} from '@angular/core';
import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  hide,
  type Middleware,
  offset,
  shift,
} from '@floating-ui/dom';

import { injectTooltipContext } from './tooltip-context';

const PLACEMENT_OPPOSITE: Record<'top' | 'right' | 'bottom' | 'left', string> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

/**
 * The tooltip bubble. Carries `role="tooltip"`, is portaled to
 * `document.body`, and is positioned by `@floating-ui/dom` while open.
 *
 * Default inline styles set `position: fixed; pointer-events: none` so the
 * bubble layers above content without intercepting hover. Override with your
 * own CSS if you need a different stacking context — but per APG, do not put
 * interactive elements inside.
 */
@Directive({
  selector: '[forTooltipContent]',
  exportAs: 'forTooltipContent',
  host: {
    role: 'tooltip',
    '[id]': 'ctx.contentId()',
    '[attr.data-state]': 'ctx.open() ? "open" : "closed"',
    '[attr.hidden]': 'ctx.open() ? null : ""',
    style: 'position: fixed; left: 0; top: 0; pointer-events: none;',
  },
})
export class ForTooltipContent {
  protected readonly ctx = injectTooltipContext('ForTooltipContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const el = this.#host.nativeElement;

    afterNextRender(() => {
      // Portal: move the bubble out of any clipping / transform ancestor and
      // into the document body so floating-ui's `position: fixed` math is
      // unaffected by parent containing blocks.
      if (el.parentNode !== document.body) {
        document.body.appendChild(el);
      }
    });

    effect((onCleanup) => {
      const isOpen = this.ctx.open();
      const trigger = this.ctx.trigger();
      const arrowEl = this.ctx.arrow();
      const placement = this.ctx.placement();
      const offsetValue = this.ctx.offset();

      if (!isOpen || !trigger) {
        return;
      }

      const middleware: Middleware[] = [
        offset(offsetValue),
        flip(),
        shift({ padding: 8 }),
        hide(),
      ];
      if (arrowEl) {
        middleware.push(arrow({ element: arrowEl }));
      }

      const cleanup = autoUpdate(trigger, el, () => {
        computePosition(trigger, el, { placement, middleware }).then(
          ({ x, y, placement: resolvedPlacement, middlewareData }) => {
            // The element may have been hidden again between the schedule
            // and the resolution of the floating-ui promise — bail in that
            // case to avoid clobbering styles after close.
            if (!this.ctx.open()) {
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

    inject(DestroyRef).onDestroy(() => {
      // Remove from body if still attached so the host component's destroy
      // doesn't trip over a node Angular thinks lives elsewhere.
      el.remove();
    });
  }
}
