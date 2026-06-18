import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { injectCarouselContext } from './carousel-context';

/**
 * One slide in the carousel track. Carries `role="group"` and
 * `aria-roledescription="slide"` per the WAI-ARIA APG Carousel pattern.
 *
 * The default `aria-label` is the positional `"N of M"` string (APG mandates
 * a positional label on each slide). Set `ariaLabel` to override with a
 * semantically richer label for the specific slide content.
 *
 * Off-view slides (outside `[activeIndex, activeIndex + slidesPerView - 1]`)
 * are hidden from the accessibility tree and focus order via
 * `aria-hidden="true"` + `inert`.
 */
@Directive({
  selector: '[forCarouselSlide]',
  exportAs: 'forCarouselSlide',
  host: {
    role: 'group',
    'aria-roledescription': 'slide',
    '[attr.aria-label]': 'ariaLabel() || positionLabel()',
    '[attr.data-state]': 'current() ? "active" : "inactive"',
    '[attr.data-in-view]': 'inView() ? "" : null',
    '[attr.aria-hidden]': 'inView() ? null : "true"',
    '[attr.inert]': 'inView() ? null : ""',
  },
})
export class ForCarouselSlide {
  protected readonly ctx = injectCarouselContext('ForCarouselSlide');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Override the default positional `aria-label` (`"N of M"`). Use this to
   * provide a semantically richer label when the slide's content has a
   * meaningful title (e.g. the product name). When `null` (default), the
   * positional label is used automatically. Localize that default format
   * app-wide via `provideForCarouselDefaults`'s `slideLabel`.
   */
  readonly ariaLabel = input<string | null>(null);

  readonly #index = computed(() => this.ctx.indexOfSlide(this.#host.nativeElement));

  /** Whether this is the current (active) slide. */
  protected readonly current = computed(() => this.ctx.isCurrent(this.#index()));

  /** Whether this slide is within the visible window. */
  protected readonly inView = computed(() => this.ctx.isInView(this.#index()));

  /** The positional `"N of M"` label used when no explicit `ariaLabel` is set. */
  protected readonly positionLabel = computed(() => {
    const i = this.#index();
    return i < 0 ? null : this.ctx.slideLabel(i + 1);
  });

  constructor() {
    const handle = { host: this.#host.nativeElement };
    registerHandle(
      handle,
      (h) => this.ctx.registerSlide(h),
      (h) => this.ctx.unregisterSlide(h),
    );
  }
}
