import {
  DOCUMENT,
  PLATFORM_ID,
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { injectScrollAreaContext } from './scroll-area-context';

const HIDE_NATIVE_SCROLLBARS_STYLE_ID = 'for-scroll-area-hide-native';
const HIDE_NATIVE_SCROLLBARS_CSS = `
  [forScrollAreaViewport] {
    overflow: scroll;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  [forScrollAreaViewport]::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
`;

function injectHidingStylesOnce(doc: Document): void {
  if (doc.getElementById(HIDE_NATIVE_SCROLLBARS_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = HIDE_NATIVE_SCROLLBARS_STYLE_ID;
  style.textContent = HIDE_NATIVE_SCROLLBARS_CSS;
  doc.head.appendChild(style);
}

/**
 * The actually-scrolling element. Hides native scrollbars (the only place
 * in forty-cdk that ships CSS — see README), tracks scroll position, and
 * reports geometry to the root so the synthetic scrollbar can render.
 *
 * Focusable by default (`tabindex="0"`) so a scroll area whose content has no
 * focusable children is still reachable and keyboard-scrollable — the browser
 * gives a focused overflow container native arrow / PageUp / PageDown / Home /
 * End / Space scrolling. Consumers whose content is already keyboard-focusable
 * can drop the extra tab stop with `[focusable]="false"`.
 */
@Directive({
  selector: '[forScrollAreaViewport]',
  exportAs: 'forScrollAreaViewport',
  host: {
    '[attr.tabindex]': 'focusable() ? 0 : null',
    '(scroll)': 'onScroll()',
  },
})
export class ForScrollAreaViewport {
  readonly #ctx = injectScrollAreaContext('ForScrollAreaViewport');

  /**
   * Whether the viewport is a keyboard tab stop. Defaults to `true`, emitting
   * `tabindex="0"` so the scroll container is focusable and gets native
   * keyboard scrolling (arrows / PageUp / PageDown / Home / End / Space) even
   * when its content holds no focusable elements. Set `false` to remove the
   * extra tab stop when the projected content is already keyboard-focusable.
   */
  readonly focusable = input(true, { transform: booleanAttribute });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.#isBrowser) {
      injectHidingStylesOnce(this.#document);
    }
    this.#ctx.registerViewport(this.#host);
    inject(DestroyRef).onDestroy(() => this.#ctx.registerViewport(null));

    afterNextRender(() => {
      this.#syncScroll();
      this.#syncSize();
    });

    // Track size changes via ResizeObserver — simpler / lighter than
    // polling, and consistent with the rest of the library's reactive
    // patterns. Browser-only API; no-op on server.
    //
    // The content element is observed only when the consumer explicitly
    // marks it with `[forScrollAreaContent]`. Without that marker we skip
    // content observation entirely (rather than guessing `firstElementChild`,
    // which silently breaks on layered / multi-sibling layouts).
    if (this.#isBrowser && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.#syncSize());
      ro.observe(this.#host);
      inject(DestroyRef).onDestroy(() => ro.disconnect());

      // Re-attach the observer whenever the registered content element
      // changes (registers, unregisters, or swaps). `effect` is the right
      // primitive here: this is a DOM imperative side effect, not derived
      // state — see CLAUDE.md "Never propagate state inside `effect()`".
      let observedContent: HTMLElement | null = null;
      effect(() => {
        const next = this.#ctx.content();
        if (next === observedContent) return;
        if (observedContent) ro.unobserve(observedContent);
        if (next) ro.observe(next);
        observedContent = next;
      });
    }
  }

  protected onScroll(): void {
    this.#syncScroll();
    this.#ctx.noteUserScroll();
  }

  #syncScroll(): void {
    this.#ctx.reportScroll(this.#host.scrollLeft, this.#host.scrollTop);
  }

  #syncSize(): void {
    this.#ctx.reportSize(
      this.#host.clientWidth,
      this.#host.clientHeight,
      this.#host.scrollWidth,
      this.#host.scrollHeight,
    );
    this.#syncScroll();
  }
}
