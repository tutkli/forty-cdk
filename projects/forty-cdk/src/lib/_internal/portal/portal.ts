import { afterNextRender, DestroyRef, ElementRef, inject } from '@angular/core';

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
 */
export function injectPortal(config: PortalConfig = {}): void {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const destroyRef = inject(DestroyRef);
  const el = host.nativeElement;
  const target = config.target ?? document.body;

  afterNextRender(() => {
    if (el.parentNode !== target) {
      target.appendChild(el);
    }
  });

  destroyRef.onDestroy(() => el.remove());
}
