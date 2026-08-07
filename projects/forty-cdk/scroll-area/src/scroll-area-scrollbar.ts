import {
  computed,
  DestroyRef,
  DOCUMENT,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { clamp, injectElementSize } from 'forty-cdk/core';
import { injectScrollAreaContext, type ForScrollbarOrientation } from './scroll-area-context';
import { jumpPosition, pagePosition, trackPressDirection } from './track-press';

const MIN_THUMB_SIZE = 8;
const MIN_PAGE_FRACTION = 0.875;
const MAX_PAGE_OVERLAP_PX = 40;

/**
 * Synthetic scrollbar track. Reflects `data-orientation`, `data-state`
 * (`visible` / `hidden`), owns the track / thumb geometry the thumb renders
 * from, and handles a press on bare track (`trackPress` on the root).
 *
 * The element is fully removed (`hidden`) when the corresponding axis has
 * no overflow *and* `type` is not `'always'` — there is no scrollbar to
 * render. Under `type="always"` the track stays painted regardless of
 * overflow, so the consumer's reserved gutter is never empty.
 * Visibility is enforced with an inline `display: none` (which beats any
 * author `display` rule a consumer applies via a class) in addition to the
 * `hidden` attribute that removes it from the a11y tree.
 */
@Directive({
  selector: '[forScrollAreaScrollbar]',
  exportAs: 'forScrollAreaScrollbar',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-state]': 'state()',
    '[hidden]': '!painted()',
    '[style.display]': 'painted() ? null : "none"',
    '(pointerdown)': 'onTrackPointerDown($event)',
    '(lostpointercapture)': 'onLostPointerCapture()',
  },
})
export class ForScrollAreaScrollbar {
  /**
   * Axis this scrollbar controls.
   */
  readonly orientation = input.required<ForScrollbarOrientation>();
  readonly ctx = injectScrollAreaContext('ForScrollAreaScrollbar');
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #document = inject(DOCUMENT);

  /**
   * Reactive size of the track itself, measured independently of the viewport.
   * The thumb's size and travel are computed against the *track* length, which
   * the consumer is free to lay out shorter than the viewport (e.g. insets, a
   * reserved corner, padding), so the viewport's reported client dimensions are
   * not a substitute — the track must be observed directly.
   *
   * The target is a constant (`this.host` never changes), so `injectElementSize`'s
   * target-swap branch is dead weight here; it is reused only for its
   * `ResizeObserver` plumbing and change-deduped emission.
   */
  readonly #hostRef = signal<HTMLElement | null>(this.host);
  readonly size = injectElementSize(this.#hostRef);

  /** Track length along this scrollbar's axis, in CSS pixels. */
  readonly trackLength = computed<number>(() => {
    const size = this.size();
    if (!size) return 0;
    return this.orientation() === 'horizontal' ? size.width : size.height;
  });

  /**
   * Maximum scroll offset of this axis (`scrollSize - clientSize`), floored at
   * `0`. Deliberately epsilon-free — unlike `hasOverflow`, which keeps a 1px
   * threshold because it gates the track's self-removal.
   */
  readonly maxScroll = computed<number>(() => {
    const ctx = this.ctx;
    const max =
      this.orientation() === 'horizontal'
        ? ctx.scrollWidth() - ctx.clientWidth()
        : ctx.scrollHeight() - ctx.clientHeight();
    return Math.max(0, max);
  });

  readonly #ratio = computed<number>(() => {
    const ctx = this.ctx;
    if (this.orientation() === 'horizontal') {
      const sw = ctx.scrollWidth();
      if (sw <= 0) return 0;
      return Math.min(1, ctx.clientWidth() / sw);
    }
    const sh = ctx.scrollHeight();
    if (sh <= 0) return 0;
    return Math.min(1, ctx.clientHeight() / sh);
  });

  /**
   * Rendered thumb length in CSS pixels — the viewport / content ratio applied
   * to the track, floored at a `8px` minimum so a very long content still
   * leaves a grabbable thumb.
   */
  readonly thumbSize = computed<number>(() => {
    const tl = this.trackLength();
    const r = this.#ratio();
    if (tl === 0 || r === 0) return 0;
    return Math.max(MIN_THUMB_SIZE, Math.floor(tl * r));
  });

  /** Travel available to the thumb along the track, floored at `0`. */
  readonly usableTrack = computed<number>(() => Math.max(0, this.trackLength() - this.thumbSize()));

  /**
   * Scroll offset of this axis normalised to a start-edge-origin (left / top)
   * value in `[0, maxScroll]`.
   *
   * On the vertical axis this is just `scrollTop`. On the horizontal axis, LTR
   * `scrollLeft` is already left-origin, but in RTL the browser reports
   * `scrollLeft` in the negative model (`0` at rest with the content's right
   * edge flush, `-maxScroll` when scrolled fully left), so a left-origin
   * position is `scrollLeft + maxScroll` — `maxScroll` at rest (thumb pinned to
   * the right) down to `0` when scrolled forward. Every other geometry member
   * (and `scrollToPosition`) works in this one space, so RTL is absorbed here
   * and nowhere else.
   */
  readonly scrollPosition = computed<number>(() => {
    if (this.orientation() === 'vertical') return this.ctx.scrollTop();
    const max = this.maxScroll();
    return this.ctx.dir() === 'rtl' ? this.ctx.scrollLeft() + max : this.ctx.scrollLeft();
  });

  /**
   * Thumb offset from the track's start edge in CSS pixels, in the same
   * start-edge-origin space as `scrollPosition` (so in RTL the thumb rests at
   * `usableTrack`, flush with the track's right edge).
   */
  readonly thumbOffset = computed<number>(() => {
    const max = this.maxScroll();
    if (max <= 0) return 0;
    return (this.scrollPosition() / max) * this.usableTrack() || 0;
  });

  /**
   * One page step in scroll pixels — `max(client * 0.875, client - 40, 1)`,
   * mirroring the platform's page step so a paged track press keeps a sliver of
   * the previous page in view instead of stepping a full viewport.
   */
  readonly pageStep = computed<number>(() => {
    const client =
      this.orientation() === 'horizontal' ? this.ctx.clientWidth() : this.ctx.clientHeight();
    return Math.max(client * MIN_PAGE_FRACTION, client - MAX_PAGE_OVERLAP_PX, 1);
  });

  readonly #dragging = signal(false);
  /** True while the thumb is being dragged. Pins the track visible / painted. */
  readonly dragging = this.#dragging.asReadonly();

  readonly #pressing = signal(false);
  /** True while a track press is in flight. Pins the track visible / painted. */
  readonly pressing = this.#pressing.asReadonly();

  readonly #thumb = signal<HTMLElement | null>(null);
  /** The registered `[forScrollAreaThumb]` element, when one is mounted. */
  readonly thumb = this.#thumb.asReadonly();

  #pressPoint = 0;
  #pressDirection: -1 | 1 | null = null;
  #pressTarget = 0;
  #pressPointerId: number | null = null;
  #repeatTimer: ReturnType<typeof setTimeout> | null = null;
  #gesture: AbortController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#endPress());
  }

  /**
   * Marks the track as actively dragged so an in-flight drag is never aborted
   * by the scrollbar self-hiding (`type="hover"` / `"scroll"` fading the track,
   * or a consumer `display:none` on `data-state="hidden"`). Called by the thumb
   * on pointer-down / drag-end.
   */
  setDragging(dragging: boolean): void {
    this.#dragging.set(dragging);
  }

  /**
   * Registers the thumb element so the track handler can tell a press that
   * originated on the thumb (the thumb owns that gesture) from a bare-track
   * press. Called by `[forScrollAreaThumb]` on construction.
   */
  registerThumb(el: HTMLElement): void {
    this.#thumb.set(el);
  }

  /**
   * Clears the registered thumb, guarded on identity so a late teardown of an
   * old thumb doesn't blow away a freshly registered replacement.
   */
  unregisterThumb(el: HTMLElement): void {
    if (this.#thumb() === el) {
      this.#thumb.set(null);
    }
  }

  readonly hasOverflow = computed<boolean>(() => {
    if (this.orientation() === 'horizontal') {
      return this.ctx.scrollWidth() - this.ctx.clientWidth() > 1;
    }
    return this.ctx.scrollHeight() - this.ctx.clientHeight() > 1;
  });

  /**
   * Whether the track is rendered at all. `'always'` keeps it painted
   * unconditionally (a stable, always-present track); every
   * other `type` paints only the axis that actually overflows. An in-flight
   * thumb drag or track press also pins it painted so the gesture is never
   * aborted by the track self-removing. Gates both the `hidden` attribute and
   * the inline `display: none` self-removal.
   */
  readonly painted = computed<boolean>(
    () => this.dragging() || this.pressing() || this.ctx.type() === 'always' || this.hasOverflow(),
  );

  /**
   * `'visible' | 'hidden'`. An in-flight thumb drag or track press forces
   * `'visible'` so a consumer fade on `data-state="hidden"` can't hide the
   * track mid-gesture. Otherwise: `'always'` resolves to `'visible'` regardless
   * of overflow — the track is permanently present. `'auto'` shows whenever the
   * axis overflows; `'hover'` / `'scroll'` additionally gate on the interaction
   * signals. A non-overflowing axis is `'hidden'` for every mode except
   * `'always'`.
   */
  readonly state = computed<'visible' | 'hidden'>(() => {
    if (this.dragging() || this.pressing()) return 'visible';
    switch (this.ctx.type()) {
      case 'always':
        return 'visible';
      case 'auto':
        return this.hasOverflow() ? 'visible' : 'hidden';
      case 'hover':
        return this.hasOverflow() && (this.ctx.hovering() || this.ctx.scrolling())
          ? 'visible'
          : 'hidden';
      case 'scroll':
        return this.hasOverflow() && this.ctx.scrolling() ? 'visible' : 'hidden';
    }
  });

  /**
   * Scrolls the viewport so this axis rests at `position`, given in the
   * start-edge-origin space of `scrollPosition` and clamped into
   * `[0, maxScroll]`. RTL's negative `scrollLeft` model is applied here.
   *
   * Writes plain `scrollLeft` / `scrollTop` — the library ships no
   * `behavior: 'smooth'`, so motion (and its `prefers-reduced-motion` gate) is
   * the consumer's `scroll-behavior` on `[forScrollAreaViewport]`.
   */
  scrollToPosition(position: number): void {
    const viewport = this.ctx.viewport();
    if (!viewport) return;
    const max = this.maxScroll();
    if (max <= 0) return;
    const next = clamp(position, 0, max);
    if (this.orientation() === 'vertical') {
      viewport.scrollTop = next;
      return;
    }
    viewport.scrollLeft = this.ctx.dir() === 'rtl' ? next - max : next;
  }

  /**
   * Offset of a pointer event from the track's start edge along this axis, in
   * CSS pixels. The horizontal reading is measured from `rect.left` in **both**
   * writing directions, because `thumbOffset` is left-origin in RTL too — RTL
   * is absorbed once, in `scrollPosition` / `scrollToPosition`.
   */
  trackPointFromEvent(event: PointerEvent): number {
    const rect = this.host.getBoundingClientRect();
    return this.orientation() === 'horizontal'
      ? event.clientX - rect.left
      : event.clientY - rect.top;
  }

  /**
   * Scrolls so the thumb is centred on `trackPx` (an offset from the track's
   * start edge). A no-op when the axis cannot scroll or the thumb fills the
   * track.
   */
  scrollToTrackPoint(trackPx: number): void {
    const next = jumpPosition({
      point: trackPx,
      thumbSize: this.thumbSize(),
      usableTrack: this.usableTrack(),
      maxScroll: this.maxScroll(),
    });
    if (next === null) return;
    this.scrollToPosition(next);
  }

  /**
   * Steps the viewport one `pageStep` forward (`1`) or backward (`-1`) along
   * this axis, clamped to the scroll range. A no-op when the axis cannot scroll
   * or is already at that end.
   */
  pageBy(direction: -1 | 1): void {
    const next = pagePosition(
      {
        point: direction === 1 ? this.trackLength() : 0,
        thumbSize: this.thumbSize(),
        usableTrack: this.usableTrack(),
        maxScroll: this.maxScroll(),
        position: this.scrollPosition(),
        pageStep: this.pageStep(),
      },
      direction,
    );
    if (next === null) return;
    this.scrollToPosition(next);
  }

  protected onTrackPointerDown(event: PointerEvent): void {
    if ((event.pointerType === 'mouse' && event.button !== 0) || event.defaultPrevented) return;
    const mode = this.ctx.trackPress();
    if (mode === 'none') return;
    const thumb = this.thumb();
    if (thumb && thumb.contains(event.target as Node)) return;
    event.preventDefault();
    const point = this.trackPointFromEvent(event);
    if (mode === 'jump') {
      this.#beginPress(event, point, null);
      this.scrollToTrackPoint(point);
      return;
    }
    const direction = trackPressDirection(point, this.thumbOffset(), this.thumbSize());
    if (direction === 0) return;
    this.#beginPress(event, point, direction);
    this.#pressTarget = this.scrollPosition();
    this.#pageOnce();
    this.#scheduleRepeat(this.ctx.trackPressRepeatDelay());
  }

  protected onLostPointerCapture(): void {
    this.#endPress();
  }

  #beginPress(event: PointerEvent, point: number, direction: -1 | 1 | null): void {
    this.#pressPoint = point;
    this.#pressDirection = direction;
    this.#pressing.set(true);
    this.#pressPointerId = event.pointerId;
    this.host.setPointerCapture(event.pointerId);
    // Listen on the owner document, not the track element: pointer capture is
    // set on the track (so the gesture stays bound to this pointer), but the
    // captured node can be removed mid-gesture when the scrollbar self-hides
    // (`type="hover"` / `"scroll"`). Document-level listeners keep firing after
    // that removal, so the gesture is not silently aborted.
    this.#gesture = new AbortController();
    const options = { signal: this.#gesture.signal };
    const doc = this.#document;
    doc.addEventListener('pointermove', this.#onPressMove, options);
    doc.addEventListener('pointerup', this.#onPressUp, options);
    doc.addEventListener('pointercancel', this.#onPressUp, options);
  }

  readonly #onPressMove = (event: PointerEvent): void => {
    if (!this.#pressing()) return;
    const point = this.trackPointFromEvent(event);
    this.#pressPoint = point;
    if (this.#pressDirection === null) {
      this.scrollToTrackPoint(point);
    }
  };

  readonly #onPressUp = (): void => {
    this.#endPress();
  };

  #pageOnce(): void {
    if (this.#pressDirection === null) return;
    const next = pagePosition(
      {
        point: this.#pressPoint,
        thumbSize: this.thumbSize(),
        usableTrack: this.usableTrack(),
        maxScroll: this.maxScroll(),
        position: this.#pressTarget,
        pageStep: this.pageStep(),
      },
      this.#pressDirection,
    );
    if (next === null) return;
    this.#pressTarget = next;
    this.scrollToPosition(next);
  }

  #scheduleRepeat(delay: number): void {
    if (this.#repeatTimer !== null) clearTimeout(this.#repeatTimer);
    this.#repeatTimer = setTimeout(
      () => {
        this.#repeatTimer = null;
        if (!this.#pressing()) return;
        this.#pageOnce();
        this.#scheduleRepeat(Math.max(0, this.ctx.trackPressRepeatInterval()));
      },
      Math.max(0, delay),
    );
  }

  #endPress(): void {
    if (this.#repeatTimer !== null) {
      clearTimeout(this.#repeatTimer);
      this.#repeatTimer = null;
    }
    this.#pressing.set(false);
    this.#pressDirection = null;
    this.#gesture?.abort();
    this.#gesture = null;
    const pointerId = this.#pressPointerId;
    this.#pressPointerId = null;
    if (pointerId !== null && this.host.hasPointerCapture(pointerId)) {
      this.host.releasePointerCapture(pointerId);
    }
  }
}
