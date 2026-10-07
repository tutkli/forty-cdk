import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

/**
 * One slide in the carousel track. Carries `role="group"` and
 * `aria-roledescription="slide"` per the WAI-ARIA APG Carousel pattern; the
 * role description is localizable through `provideForCarouselDefaults`'s
 * `slideRoleDescription`.
 *
 * The default `aria-label` is the positional `"N of M"` string (APG mandates
 * a positional label on each slide). Set `ariaLabel` to override with a
 * semantically richer label for the specific slide content.
 *
 * Slides that do not intersect the viewport, as laid out by
 * `--for-carousel-offset` after `align` and `containScroll` apply, are hidden
 * from the accessibility tree and focus order via `aria-hidden="true"` + `inert`.
 */
@Directive({
  selector: '[forCarouselSlide]',
  exportAs: 'forCarouselSlide',
  host: {
    role: 'group',
    '[attr.aria-roledescription]': 'roleDescription()',
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

  protected readonly roleDescription = computed(() => this.ctx.slideRoleDescription());

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
