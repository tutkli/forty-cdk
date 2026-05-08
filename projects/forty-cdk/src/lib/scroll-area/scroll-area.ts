import { DestroyRef, Directive, inject, input, numberAttribute, signal } from '@angular/core';

import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_SCROLL_AREA_CONTEXT,
  type ForScrollAreaContext,
  type ForScrollAreaType,
} from './scroll-area-context';
import { FOR_SCROLL_AREA_DEFAULTS } from './scroll-area-defaults';

/**
 * Root of the custom-scrollbar primitive. Owns the viewport reference,
 * scroll geometry signals, and visibility state for the synthetic
 * scrollbars.
 *
 * Native scrollbars on the inner viewport are hidden via styles injected
 * by `[forScrollAreaViewport]` (the only place in forty-cdk that
 * imperatively touches CSS); the consumer styles `[forScrollAreaThumb]`
 * however they like.
 *
 * @example
 * ```html
 * <div forScrollArea>
 *   <div forScrollAreaViewport>
 *     <div forScrollAreaContent>… long content …</div>
 *   </div>
 *   <div forScrollAreaScrollbar orientation="vertical">
 *     <div forScrollAreaThumb></div>
 *   </div>
 *   <div forScrollAreaScrollbar orientation="horizontal">
 *     <div forScrollAreaThumb></div>
 *   </div>
 *   <div forScrollAreaCorner></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forScrollArea]',
  exportAs: 'forScrollArea',
  host: {
    '[attr.data-type]': 'type()',
    '[attr.dir]': 'dir() === "rtl" ? "rtl" : null',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'onPointerLeave()',
  },
  providers: [{ provide: FOR_SCROLL_AREA_CONTEXT, useExisting: ForScrollArea }],
})
export class ForScrollArea implements ForScrollAreaContext {
  readonly #defaults = inject(FOR_SCROLL_AREA_DEFAULTS);

  /**
   * When the synthetic scrollbars are visible:
   * - `auto`: shown only when content overflows.
   * - `always`: shown whenever there is overflow, regardless of interaction.
   * - `scroll`: shown during scroll, faded after `scrollHideDelay` ms.
   * - `hover`: shown while the cursor is over the area (and during scroll).
   */
  readonly type = input<ForScrollAreaType>('hover');

  /**
   * ms after the most recent scroll before scrollbars fade (only
   * `type="scroll"` and `"hover"`). The default is read from
   * `provideForScrollAreaDefaults` for the surrounding scope.
   */
  readonly scrollHideDelay = input(this.#defaults.scrollHideDelay, {
    transform: numberAttribute,
  });

  readonly dir = input<WritingDirection>('ltr');

  readonly #viewport = signal<HTMLElement | null>(null);
  readonly viewport = this.#viewport.asReadonly();

  readonly #content = signal<HTMLElement | null>(null);
  readonly content = this.#content.asReadonly();

  readonly #scrollLeft = signal(0);
  readonly #scrollTop = signal(0);
  readonly scrollLeft = this.#scrollLeft.asReadonly();
  readonly scrollTop = this.#scrollTop.asReadonly();

  readonly #clientW = signal(0);
  readonly #clientH = signal(0);
  readonly #scrollW = signal(0);
  readonly #scrollH = signal(0);
  readonly clientWidth = this.#clientW.asReadonly();
  readonly clientHeight = this.#clientH.asReadonly();
  readonly scrollWidth = this.#scrollW.asReadonly();
  readonly scrollHeight = this.#scrollH.asReadonly();

  readonly #hovering = signal(false);
  readonly hovering = this.#hovering.asReadonly();

  readonly #scrolling = signal(false);
  readonly scrolling = this.#scrolling.asReadonly();
  #scrollTimer: ReturnType<typeof setTimeout> | null = null;

  registerViewport(el: HTMLElement | null): void {
    this.#viewport.set(el);
  }

  registerContent(el: HTMLElement): void {
    this.#content.set(el);
  }

  unregisterContent(el: HTMLElement): void {
    // Only clear if the unregistering element is the one we currently track,
    // so a late teardown of an old content piece doesn't blow away a freshly
    // registered replacement.
    if (this.#content() === el) {
      this.#content.set(null);
    }
  }

  reportScroll(left: number, top: number): void {
    this.#scrollLeft.set(left);
    this.#scrollTop.set(top);
  }

  reportSize(clientW: number, clientH: number, scrollW: number, scrollH: number): void {
    this.#clientW.set(clientW);
    this.#clientH.set(clientH);
    this.#scrollW.set(scrollW);
    this.#scrollH.set(scrollH);
  }

  noteUserScroll(): void {
    this.#scrolling.set(true);
    if (this.#scrollTimer !== null) clearTimeout(this.#scrollTimer);
    this.#scrollTimer = setTimeout(
      () => {
        this.#scrollTimer = null;
        this.#scrolling.set(false);
      },
      Math.max(0, this.scrollHideDelay()),
    );
  }

  protected onPointerEnter(): void {
    this.#hovering.set(true);
  }

  protected onPointerLeave(): void {
    this.#hovering.set(false);
  }

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.#scrollTimer !== null) clearTimeout(this.#scrollTimer);
    });
  }
}
