import { Directive, inject } from '@angular/core';

import { injectModalBackdrop } from 'forty-cdk/core-overlay';
import { FOR_DRAWER_INSTANCE_ID, injectDrawerContext } from './drawer-context';

/**
 * Optional backdrop overlay. Portaled to `document.body` so it sits
 * underneath the drawer regardless of where it's declared. While mounted
 * the backdrop is visible; mount/unmount it alongside the drawer with the
 * same `@if` so `animate.enter` / `animate.leave` works on both.
 *
 * Reflects `data-fade-from-active` when `fadeFromIndex` on the drawer root
 * is set and the active snap point is at or past that index — consumers
 * tie this to a CSS opacity transition for the "backdrop fades
 * in once you snap up past N" effect.
 *
 * Publishes the live swipe progress toward the anchored edge as the
 * `--for-drawer-swipe-progress` custom property (`0` at rest → `1` fully
 * swiped off-screen) and mirrors the surface's `data-dragging` attribute.
 * Together these drive the "backdrop fades out as you swipe to
 * dismiss" effect with pure CSS:
 *
 * ```css
 * [forDrawerBackdrop] {
 *   opacity: calc(1 - var(--for-drawer-swipe-progress, 0));
 *   transition: opacity 0.3s ease;
 * }
 * [forDrawerBackdrop][data-dragging] {
 *   transition: none; \/* track the pointer 1:1 *\/
 * }
 * ```
 *
 * Mirrors its drawer's nesting position as `data-depth` and `--for-drawer-depth`, so a nested
 * drawer's backdrop can paint above its parent drawer.
 *
 * A click on the backdrop closes the drawer with reason `'backdrop'` only when the drawer was the
 * topmost layer as the press began: with a nested drawer or a popover open above it, the press is
 * that layer's outside press and the drawer stays open.
 *
 * The directive applies no visual styles itself.
 */
@Directive({
  selector: '[forDrawerBackdrop]',
  exportAs: 'forDrawerBackdrop',
  host: {
    'data-for-drawer-backdrop': '',
    // Marker the inert-siblings utility looks for so the backdrop, which is
    // portaled to body alongside the drawer, is not inerted alongside the
    // rest of the document.
    'data-for-modal-peer': '',
    'data-state': 'open',
    '[attr.data-for-drawer-id]': 'instanceId',
    '[attr.data-fade-from-active]': 'ctx.fadeFromActive() ? "" : null',
    '[attr.data-dragging]': 'ctx.dragging() ? "" : null',
    '[style.--for-drawer-swipe-progress]': 'ctx.swipeProgress()',
    '[attr.data-depth]': 'ctx.depth()',
    '[style.--for-drawer-depth]': 'ctx.depth()',
    '(pointerdown)': 'backdrop.pointerDown()',
    '(click)': 'backdrop.click($event)',
  },
})
export class ForDrawerBackdrop {
  protected readonly ctx = injectDrawerContext('ForDrawerBackdrop');
  protected readonly backdrop = injectModalBackdrop(this.ctx);

  /**
   * Per-instance drawer id when opened through `ForDrawerManager` (reflected
   * as `data-for-drawer-id` so the manager can pair this portaled backdrop
   * with its drawer and drive its exit animation). `null` in the declarative
   * path, where the host binding emits no attribute.
   */
  protected readonly instanceId = inject(FOR_DRAWER_INSTANCE_ID, { optional: true });
}
