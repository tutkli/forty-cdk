import { DestroyRef, DOCUMENT, Directive, ElementRef, inject, signal } from '@angular/core';

import { ForScrollAreaScrollbar } from './scroll-area-scrollbar';

function injectRequiredScrollbar(): ForScrollAreaScrollbar {
  const scrollbar = inject(ForScrollAreaScrollbar, { optional: true });
  if (!scrollbar) {
    throw new Error(
      '[forty-cdk/scroll-area] ForScrollAreaThumb must be used inside a [forScrollAreaScrollbar] element.',
    );
  }
  return scrollbar;
}

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
    '[style.left.px]': 'leftPx()',
    '[style.top.px]': 'topPx()',
    '[style.transform]': 'transformValue()',
    '[attr.data-orientation]': 'scrollbar.orientation()',
    '[attr.data-state]': 'scrollbar.state()',
    '(pointerdown)': 'onPointerDown($event)',
    '(lostpointercapture)': 'onLostPointerCapture()',
  },
})
export class ForScrollAreaThumb {
  readonly scrollbar = injectRequiredScrollbar();
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);

  readonly #dragging = signal(false);
  #dragStartPointer = 0;
  #dragStartPosition = 0;

  constructor() {
    this.scrollbar.registerThumb(this.#host);
    inject(DestroyRef).onDestroy(() => {
      this.scrollbar.unregisterThumb(this.#host);
      this.#endDrag();
    });
  }

  protected widthPx(): number | null {
    return this.scrollbar.orientation() === 'horizontal' ? this.scrollbar.thumbSize() : null;
  }
  protected heightPx(): number | null {
    return this.scrollbar.orientation() === 'vertical' ? this.scrollbar.thumbSize() : null;
  }
  protected leftPx(): number | null {
    return this.scrollbar.orientation() === 'horizontal' ? 0 : null;
  }
  protected topPx(): number | null {
    return this.scrollbar.orientation() === 'vertical' ? 0 : null;
  }
  protected transformValue(): string {
    if (this.scrollbar.orientation() === 'horizontal') {
      return `translateX(${this.scrollbar.thumbOffset()}px)`;
    }
    return `translateY(${this.scrollbar.thumbOffset()}px)`;
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.#dragging.set(true);
    this.scrollbar.setDragging(true);
    this.#host.setPointerCapture(event.pointerId);
    this.#dragStartPointer =
      this.scrollbar.orientation() === 'horizontal' ? event.clientX : event.clientY;
    this.#dragStartPosition = this.scrollbar.scrollPosition();
    // Listen on the owner document, not the thumb element: pointer capture is
    // set on the thumb (so the gesture stays bound to this pointer), but the
    // captured node can be removed mid-drag when the scrollbar self-hides
    // (`type="hover"` / `"scroll"`). Document-level listeners keep firing after
    // that removal, so the drag is not silently aborted. `lostpointercapture`
    // tears the gesture down if capture is otherwise lost.
    const doc = this.#document;
    doc.addEventListener('pointermove', this.#onPointerMove);
    doc.addEventListener('pointerup', this.#onPointerUp);
    doc.addEventListener('pointercancel', this.#onPointerUp);
  }

  protected onLostPointerCapture(): void {
    this.#endDrag();
  }

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (!this.#dragging()) return;
    const usable = this.scrollbar.usableTrack();
    if (usable <= 0) return;
    const delta =
      this.scrollbar.orientation() === 'horizontal'
        ? event.clientX - this.#dragStartPointer
        : event.clientY - this.#dragStartPointer;
    this.scrollbar.scrollToPosition(
      this.#dragStartPosition + (delta / usable) * this.scrollbar.maxScroll(),
    );
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    this.#endDrag();
    if (this.#host.hasPointerCapture(event.pointerId)) {
      this.#host.releasePointerCapture(event.pointerId);
    }
  };

  #endDrag(): void {
    this.#dragging.set(false);
    this.scrollbar.setDragging(false);
    const doc = this.#document;
    doc.removeEventListener('pointermove', this.#onPointerMove);
    doc.removeEventListener('pointerup', this.#onPointerUp);
    doc.removeEventListener('pointercancel', this.#onPointerUp);
  }
}
