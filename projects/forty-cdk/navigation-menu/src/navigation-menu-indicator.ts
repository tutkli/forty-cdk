import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

import { injectNavigationMenuContext } from './navigation-menu-context';

/**
 * Optional visual indicator (underline, pill) that follows the active
 * trigger. Computes geometry from the trigger's position relative to
 * `[forNavigationMenuList]` and exposes it via CSS custom properties:
 *
 * - `--for-navigation-menu-indicator-x` — horizontal offset (px)
 * - `--for-navigation-menu-indicator-y` — vertical offset (px)
 * - `--for-navigation-menu-indicator-width` — trigger width (px)
 * - `--for-navigation-menu-indicator-height` — trigger height (px)
 *
 * Drive `transform` / `width` / `height` from these in CSS. The directive
 * is decorative — set `aria-hidden="true"` on the host element if
 * needed.
 *
 * Geometry is re-measured reactively, not on every render: a `ResizeObserver`
 * (browser-only) watches the active trigger and the surrounding list and bumps
 * a measure-tick signal, and the offset / size are recomputed only when the
 * active trigger changes or one of those boxes resizes. `afterNextRender`
 * covers the initial measure once the host is in the DOM.
 */
@Directive({
  selector: '[forNavigationMenuIndicator]',
  exportAs: 'forNavigationMenuIndicator',
  host: {
    'aria-hidden': 'true',
    '[attr.data-state]': 'state()',
    '[attr.data-orientation]': 'menu.orientation()',
    '[style.--for-navigation-menu-indicator-x.px]': 'x()',
    '[style.--for-navigation-menu-indicator-y.px]': 'y()',
    '[style.--for-navigation-menu-indicator-width.px]': 'width()',
    '[style.--for-navigation-menu-indicator-height.px]': 'height()',
  },
})
export class ForNavigationMenuIndicator {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuIndicator');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly #measureTick = signal(0);

  readonly #geometry = computed<{ x: number; y: number; width: number; height: number }>(() => {
    // Depend on the manual tick so ResizeObserver callbacks invalidate the
    // geometry, and on the active trigger so a trigger switch re-measures.
    this.#measureTick();
    // Browser-only: `getBoundingClientRect` is a layout API, and the DOM
    // `@angular/platform-server` runs on (domino) does not implement it at all —
    // so an ungated read throws a `TypeError` on Angular Universal rather than
    // returning zeros. jsdom does implement it, which is why the SSR smoke suite
    // cannot see this. Reachable since triggers register synchronously
    // ([#1636](https://github.com/tutkli/forty-cdk/issues/1636)): before that
    // `activeTriggerHost()` was always `null` server-side, so the early return
    // below hid the call by accident.
    if (!this.#isBrowser) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const trigger = this.menu.activeTriggerHost();
    const list = this.#host.parentElement;
    if (!trigger || !list) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const tr = trigger.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    return { x: tr.left - lr.left, y: tr.top - lr.top, width: tr.width, height: tr.height };
  });

  protected readonly x = computed(() => this.#geometry().x);
  protected readonly y = computed(() => this.#geometry().y);
  protected readonly width = computed(() => this.#geometry().width);
  protected readonly height = computed(() => this.#geometry().height);

  protected readonly state = computed(() => (this.menu.activeTriggerHost() ? 'visible' : 'hidden'));

  constructor() {
    // Initial measure once the host (and its list parent) are attached.
    afterNextRender(() => this.#measureTick.update((t) => t + 1));

    if (this.#isBrowser && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.#measureTick.update((t) => t + 1));
      const list = this.#host.parentElement;
      if (list) {
        ro.observe(list);
      }

      // Follow the active trigger: observe it for size changes and re-measure
      // on every switch. Pure side effect on the imperative ResizeObserver — no
      // signal writes from this effect.
      let observed: HTMLElement | null = null;
      effect(() => {
        const active = this.menu.activeTriggerHost();
        if (observed && observed !== active) {
          ro.unobserve(observed);
          observed = null;
        }
        if (active && active !== observed) {
          ro.observe(active);
          observed = active;
        }
      });

      inject(DestroyRef).onDestroy(() => ro.disconnect());
    }
  }
}
