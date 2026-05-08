import {
  DOCUMENT,
  PLATFORM_ID,
  afterNextRender,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface PortalConfig {
  /**
   * Where to portal the host element. Defaults to `document.body`. Pass a
   * specific container for cases like fullscreen API stacking, scoped
   * testing harnesses, or shadow DOM hosts.
   */
  readonly target?: HTMLElement;
}

/**
 * Moves the directive's host element to `target` (default `document.body`)
 * after the first render and removes it on destroy. Designed for primitives
 * that need to escape clipping / `transform` / `overflow: hidden` ancestors:
 * tooltips, popovers, dialogs, toasts.
 *
 * Must be called from an injection context. The directive's `ElementRef` is
 * the host that gets portaled. Angular destroy hooks still fire normally —
 * the view tree is unaffected, only the DOM position changes.
 *
 * Note: any styles scoped to the original parent (CSS modules, encapsulated
 * `:host` rules, descendant selectors) won't reach the portaled element.
 * Style it via global CSS or with classes on the host directive itself.
 *
 * SSR: the portal is a no-op on the server. Overlay primitives use
 * `afterNextRender` to wire side effects, which doesn't run server-side
 * either; static markup (role, aria-*, ids, data-state) renders normally
 * and the portaled position is established once the client takes over.
 *
 * Implementation note — destroy ordering. The deferred `appendChild` is
 * registered as `afterNextRender`; the destroy hook runs `el.remove()`. If
 * the directive is torn down between construction and the next render
 * (rare, but happens in synchronous open/close test paths or fast SPA
 * navigations), the destroy hook sees a not-yet-portaled element and
 * `el.remove()` is effectively a no-op against the original parent. Without
 * defending against it, the queued `afterNextRender` would still fire after
 * destroy and re-attach the element to `target` with no remaining destroy
 * hook to clean it up — a leak. We mitigate by:
 *
 *   1. Capturing the `AfterRenderRef` returned by `afterNextRender` and
 *      calling `.destroy()` from the destroy hook so the queued callback is
 *      cancelled if it hasn't fired yet.
 *   2. Setting a `destroyed` flag the queued callback re-checks before
 *      touching the DOM, in case it interleaves before `.destroy()` takes
 *      effect (belt-and-suspenders for harnesses that flush render queues
 *      synchronously inside teardown).
 */
export function injectPortal(config: PortalConfig = {}): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return;
  }
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const destroyRef = inject(DestroyRef);
  const doc = inject(DOCUMENT);
  const el = host.nativeElement;
  const target = config.target ?? doc.body;

  let destroyed = false;

  const ref = afterNextRender(() => {
    if (destroyed) return;
    if (el.parentNode !== target) {
      target.appendChild(el);
    }
  });

  destroyRef.onDestroy(() => {
    destroyed = true;
    // Cancel the queued render callback first — otherwise an interleaved
    // render flush could re-attach the element after we've removed it.
    ref.destroy();
    // `Element.remove()` is a no-op when the node has no parent, so this is
    // safe whether the portal moved the element to `target`, the element is
    // still in its original parent, or it's been detached already.
    el.remove();
  });
}
