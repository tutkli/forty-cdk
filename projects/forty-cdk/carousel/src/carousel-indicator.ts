import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import {
  hostButtonType,
  registerHandle,
  resolveListNavigation,
  rovingTabStop,
} from 'forty-cdk/core';
import { injectCarouselContext } from './carousel-context';

/**
 * One indicator (dot) in the slide picker. Apply on a `<button>` so
 * Enter/Space activation is native. Uses roving tabindex — only the current
 * dot owns `tabindex=0`; all others have `tabindex=-1`. Arrow/Home/End
 * navigation activates the target slide automatically (APG "grouped/tabbed
 * picker" variant).
 *
 * The current indicator is marked with `aria-current="true"` (truthy-only).
 * Disabled indicators receive `aria-disabled="true"` and `data-disabled` but
 * stay focusable (custom-role rule) so assistive tech can announce them.
 */
@Directive({
  selector: '[forCarouselIndicator]',
  exportAs: 'forCarouselIndicator',
  host: {
    '[attr.type]': 'buttonType()',
    '[attr.aria-label]': 'ariaLabel() || positionLabel()',
    '[attr.aria-current]': 'current() ? "true" : null',
    '[attr.data-state]': 'current() ? "active" : "inactive"',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForCarouselIndicator {
  protected readonly buttonType = hostButtonType();

  protected readonly ctx = injectCarouselContext('ForCarouselIndicator');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Override the default positional `aria-label` (e.g. `"Go to slide 1"`).
   * Use this to provide a more descriptive label when the slide has a title.
   * Localize that default format app-wide via `provideForCarouselDefaults`'s
   * `indicatorLabel`.
   */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Disables this indicator. Disabled indicators remain focusable (for
   * assistive tech) but ignore click and keyboard activation.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #index = computed(() => this.ctx.indexOfIndicator(this.#host.nativeElement));

  /** Whether this indicator corresponds to the current active slide. */
  protected readonly current = computed(() => this.ctx.isCurrent(this.#index()));

  /** Default positional label used when no explicit `ariaLabel` is set. */
  protected readonly positionLabel = computed(() => {
    const i = this.#index();
    return i < 0 ? null : this.ctx.indicatorLabel(i + 1);
  });

  /**
   * APG roving tabindex: user-driven roving owns it once any indicator has
   * been focused. Before that, fall back to "current slide's indicator, else
   * first enabled".
   */
  protected readonly tabindex = computed<-1 | 0>(() =>
    rovingTabStop({
      disabled: this.disabled(),
      selected: this.current(),
      hasSelected: this.ctx.hasCurrentIndicator(),
      isFirstEnabled: this.ctx.isFirstEnabledIndicator(this.#host.nativeElement),
      roving: this.ctx.roving,
      host: this.#host.nativeElement,
    }),
  );

  constructor() {
    const handle = { host: this.#host.nativeElement, disabled: this.disabled };
    registerHandle(
      handle,
      (h) => this.ctx.registerIndicator(h),
      (h) => this.ctx.unregisterIndicator(h),
    );
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.ctx.scrollTo(this.#index());
  }

  protected onFocus(): void {
    if (this.disabled()) {
      return;
    }
    this.ctx.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.ctx.orientation(),
      dir: this.ctx.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.ctx.navigate(this.#host.nativeElement, action);
  }
}
