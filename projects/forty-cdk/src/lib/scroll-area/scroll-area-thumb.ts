import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  signal,
} from '@angular/core';

import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';

const MIN_THUMB_SIZE = 8;

/**
 * The draggable thumb inside a `[forScrollAreaScrollbar]`. Sizes itself
 * proportionally to viewport / content and translates along the track
 * based on `scrollLeft` / `scrollTop`. Pointer-drag scrolls the viewport
 * proportionally.
 */
@Directive({
  selector: '[forScrollAreaThumb]',
  exportAs: 'forScrollAreaThumb',
  host: {
    '[style.position]': '"absolute"',
    '[style.width.px]': 'widthPx()',
    '[style.height.px]': 'heightPx()',
    '[style.transform]': 'transformValue()',
    '[attr.data-orientation]': 'scrollbar.orientation()',
    '[attr.data-state]': 'scrollbar.state()',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class ForScrollAreaThumb {
  readonly scrollbar = inject(ForScrollAreaScrollbar, { optional: true })!;
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly #dragging = signal(false);
  #dragStartPointer = 0;
  #dragStartScroll = 0;

  constructor() {
    if (!this.scrollbar) {
      throw new Error(
        '[forty-cdk/scroll-area] ForScrollAreaThumb must be used inside a [forScrollAreaScrollbar] element.',
      );
    }
    inject(DestroyRef).onDestroy(() => this.#endDrag());
  }

  /** Track length in CSS pixels (reactive — derived from the scrollbar's measured size). */
  readonly #trackLength = computed<number>(() => {
    const size = this.scrollbar.size();
    if (!size) return 0;
    return this.scrollbar.orientation() === 'horizontal' ? size.width : size.height;
  });

  readonly #ratio = computed<number>(() => {
    const ctx = this.scrollbar.ctx;
    if (this.scrollbar.orientation() === 'horizontal') {
      const sw = ctx.scrollWidth();
      if (sw <= 0) return 0;
      return Math.min(1, ctx.clientWidth() / sw);
    }
    const sh = ctx.scrollHeight();
    if (sh <= 0) return 0;
    return Math.min(1, ctx.clientHeight() / sh);
  });

  readonly #thumbSize = computed<number>(() => {
    const tl = this.#trackLength();
    const r = this.#ratio();
    if (tl === 0 || r === 0) return 0;
    return Math.max(MIN_THUMB_SIZE, Math.floor(tl * r));
  });

  readonly #thumbOffset = computed<number>(() => {
    const ctx = this.scrollbar.ctx;
    const tl = this.#trackLength();
    const tsz = this.#thumbSize();
    if (this.scrollbar.orientation() === 'horizontal') {
      const max = ctx.scrollWidth() - ctx.clientWidth();
      if (max <= 0) return 0;
      return ((ctx.scrollLeft() / max) * (tl - tsz)) || 0;
    }
    const max = ctx.scrollHeight() - ctx.clientHeight();
    if (max <= 0) return 0;
    return ((ctx.scrollTop() / max) * (tl - tsz)) || 0;
  });

  protected widthPx(): number | null {
    return this.scrollbar.orientation() === 'horizontal' ? this.#thumbSize() : null;
  }
  protected heightPx(): number | null {
    return this.scrollbar.orientation() === 'vertical' ? this.#thumbSize() : null;
  }
  protected transformValue(): string {
    if (this.scrollbar.orientation() === 'horizontal') {
      return `translateX(${this.#thumbOffset()}px)`;
    }
    return `translateY(${this.#thumbOffset()}px)`;
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.#dragging.set(true);
    this.#host.setPointerCapture(event.pointerId);
    this.#dragStartPointer =
      this.scrollbar.orientation() === 'horizontal' ? event.clientX : event.clientY;
    const ctx = this.scrollbar.ctx;
    this.#dragStartScroll =
      this.scrollbar.orientation() === 'horizontal' ? ctx.scrollLeft() : ctx.scrollTop();
    this.#host.addEventListener('pointermove', this.#onPointerMove);
    this.#host.addEventListener('pointerup', this.#onPointerUp);
    this.#host.addEventListener('pointercancel', this.#onPointerUp);
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (!this.#dragging()) return;
    const ctx = this.scrollbar.ctx;
    const viewport = ctx.viewport();
    if (!viewport) return;
    const tl = this.#trackLength();
    const tsz = this.#thumbSize();
    if (tl - tsz <= 0) return;
    if (this.scrollbar.orientation() === 'horizontal') {
      const delta = event.clientX - this.#dragStartPointer;
      const scrollMax = ctx.scrollWidth() - ctx.clientWidth();
      const scrollDelta = (delta / (tl - tsz)) * scrollMax;
      viewport.scrollLeft = this.#dragStartScroll + scrollDelta;
    } else {
      const delta = event.clientY - this.#dragStartPointer;
      const scrollMax = ctx.scrollHeight() - ctx.clientHeight();
      const scrollDelta = (delta / (tl - tsz)) * scrollMax;
      viewport.scrollTop = this.#dragStartScroll + scrollDelta;
    }
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    this.#endDrag();
    if (this.#host.hasPointerCapture(event.pointerId)) {
      this.#host.releasePointerCapture(event.pointerId);
    }
  };

  #endDrag(): void {
    this.#dragging.set(false);
    this.#host.removeEventListener('pointermove', this.#onPointerMove);
    this.#host.removeEventListener('pointerup', this.#onPointerUp);
    this.#host.removeEventListener('pointercancel', this.#onPointerUp);
  }
}
