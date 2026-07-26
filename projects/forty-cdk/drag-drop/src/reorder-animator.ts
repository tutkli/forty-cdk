import { afterNextRender, type Injector } from '@angular/core';

import { playFlip, type FlipRect, type DragPreview } from 'forty-cdk/core';
import type { ForDropListContext } from './drag-drop-context';

/** Options handed to {@link ReorderAnimator} at drop time. */
export interface ReorderAnimatorOptions {
  /** The source list plus its connected lists, whose items participate in the FLIP. */
  readonly containers: readonly ForDropListContext[];
  /** Injector for the post-commit `afterNextRender` Last-rect capture. */
  readonly injector: Injector;
  /** The browser window (reflow + timeout), or `null` in non-DOM environments. */
  readonly win: Window | null;
}

/**
 * Lazy `animateReorder` strategy: runs the FLIP reflow of displaced sibling items and settles the
 * floating preview into the final slot on a committed drop.
 *
 * Created in `drop()` only when the animation gate is satisfied (`animateReorder` on, a browser
 * platform, motion not reduced, and the item actually moved); when it is not, the list creates no
 * animator and tears down instantly, replacing the former inline `animate && first` gate.
 *
 * {@link captureFirst} measures every item's pre-change position and must run **before** the
 * `dragDrop` event mutates the DOM **and before the pointer-drag placeholder is torn down**, so
 * the First rects are the parted positions the user last saw — a live-sorted drop then has nothing
 * to animate instead of snapping the siblings back. Hosts that measure zero-area (a `display:none`
 * item standing behind its placeholder) are skipped: they have no First position to invert from.
 * {@link schedule} runs the Invert + Play after the consumer's data change has rendered.
 * Constructed directly (`new ReorderAnimator(options)`); it holds no injection context beyond the
 * injector handed in for `afterNextRender`.
 */
export class ReorderAnimator {
  readonly #containers: readonly ForDropListContext[];
  readonly #injector: Injector;
  readonly #win: Window | null;
  #first: ReadonlyMap<HTMLElement, FlipRect> | null = null;

  constructor(options: ReorderAnimatorOptions) {
    this.#containers = options.containers;
    this.#injector = options.injector;
    this.#win = options.win;
  }

  /** Capture each item's First (pre-change) rect across all containers. Run before the data change. */
  captureFirst(): void {
    const map = new Map<HTMLElement, FlipRect>();
    for (const ctx of this.#containers) {
      for (const h of ctx.items()) {
        const r = h.host.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) {
          continue;
        }
        map.set(h.host, { left: r.left, top: r.top });
      }
    }
    this.#first = map;
  }

  /**
   * Schedule the FLIP play (and preview settle, when a preview was kept) after the next render —
   * once the consumer's data change has reflowed the displaced siblings into their new positions.
   */
  schedule(liftedHost: HTMLElement, preview: DragPreview | null): void {
    const first = this.#first;
    if (first === null) {
      return;
    }
    const win = this.#win;
    afterNextRender(
      () => {
        playFlip({ first, win, exclude: preview ? liftedHost : null });
        if (preview) {
          if (liftedHost.isConnected && win) {
            const r = liftedHost.getBoundingClientRect();
            preview.settle(r.left, r.top, win);
          } else {
            preview.destroy();
          }
        }
      },
      { injector: this.#injector },
    );
  }
}
