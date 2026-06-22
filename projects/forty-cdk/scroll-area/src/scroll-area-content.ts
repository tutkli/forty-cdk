import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

import { injectScrollAreaContext } from './scroll-area-context';

/**
 * Marks the content element inside `[forScrollAreaViewport]`. The viewport
 * observes this element with a `ResizeObserver` so `scrollWidth` /
 * `scrollHeight` updates when content reflows.
 *
 * Required for the synthetic scrollbar to react to content resizes — without
 * it, the viewport falls back to no observation and scrollbars stay sized to
 * whatever the layout reported on first render.
 */
@Directive({
  selector: '[forScrollAreaContent]',
  exportAs: 'forScrollAreaContent',
})
export class ForScrollAreaContent {
  readonly #ctx = injectScrollAreaContext('ForScrollAreaContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    this.#ctx.registerContent(this.#host);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterContent(this.#host));
  }
}
