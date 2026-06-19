import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectPortal } from '../_internal/portal/portal';
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
 * Publishes the live drag progress toward the anchored edge as the
 * `--for-drawer-drag-progress` custom property (`0` at rest → `1` fully
 * dragged off-screen) and mirrors the surface's `data-dragging` attribute.
 * Together these drive the "backdrop fades out as you swipe to
 * dismiss" effect with pure CSS:
 *
 * ```css
 * [forDrawerBackdrop] {
 *   opacity: calc(1 - var(--for-drawer-drag-progress, 0));
 *   transition: opacity 0.3s ease;
 * }
 * [forDrawerBackdrop][data-dragging] {
 *   transition: none; \/* track the pointer 1:1 *\/
 * }
 * ```
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
    '[style.--for-drawer-drag-progress]': 'ctx.dragProgress()',
    '(click)': 'onClick($event)',
  },
})
export class ForDrawerBackdrop {
  protected readonly ctx = injectDrawerContext('ForDrawerBackdrop');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Per-instance drawer id when opened through `ForDrawerManager` (reflected
   * as `data-for-drawer-id` so the manager can pair this portaled backdrop
   * with its drawer and drive its exit animation). `null` in the declarative
   * path, where the host binding emits no attribute.
   */
  protected readonly instanceId = inject(FOR_DRAWER_INSTANCE_ID, { optional: true });

  constructor() {
    injectPortal({ target: this.ctx.container });
    // Register so the drawer's dismissable layer treats pointer-down on the
    // backdrop as "inside" — see ForDrawerContext#registerBackdrop.
    this.ctx.registerBackdrop(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => this.ctx.registerBackdrop(null));
  }

  protected onClick(event: MouseEvent): void {
    // Only close on direct backdrop click, not events bubbled from a child.
    if (event.target === event.currentTarget) {
      this.ctx.requestClose('backdrop');
    }
  }
}
