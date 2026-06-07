import { DOCUMENT, PLATFORM_ID, DestroyRef, ElementRef, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { afterNextRenderCancellable } from '../after-next-render-cancellable/after-next-render-cancellable';

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
 * registered via `afterNextRenderCancellable`; the destroy hook runs
 * `el.remove()`. If the directive is torn down between construction and the
 * next render (rare, but happens in synchronous open/close test paths or fast
 * SPA navigations), the destroy hook sees a not-yet-portaled element and
 * `el.remove()` is effectively a no-op against the original parent. Without
 * defending against it, the queued `afterNextRender` would still fire after
 * destroy and re-attach the element to `target` with no remaining destroy
 * hook to clean it up — a leak. The shared `afterNextRenderCancellable`
 * helper cancels the queued callback on destroy (it captures the
 * `AfterRenderRef`, calls `.destroy()` from its own destroy hook, and guards
 * the callback with a `destroyed` flag), so the `appendChild` never runs once
 * the directive is gone.
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

  afterNextRenderCancellable(() => {
    if (el.parentNode !== target) {
      target.appendChild(el);
    }
  });

  destroyRef.onDestroy(() => {
    // `Element.remove()` is a no-op when the node has no parent, so this is
    // safe whether the portal moved the element to `target`, the element is
    // still in its original parent, or it's been detached already. It also
    // cleans up the synchronous-teardown ordering, where the pending
    // `appendChild` flushes just before this hook runs: the cancellation in
    // `afterNextRenderCancellable` covers the true-async path (queued render
    // after destroy), `el.remove()` covers the synchronous one.
    el.remove();
  });
}
