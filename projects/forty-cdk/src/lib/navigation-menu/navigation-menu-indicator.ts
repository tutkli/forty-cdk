import { afterEveryRender, computed, Directive, ElementRef, inject, signal } from '@angular/core';

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

  readonly #x = signal(0);
  readonly #y = signal(0);
  readonly #w = signal(0);
  readonly #h = signal(0);
  protected readonly x = this.#x.asReadonly();
  protected readonly y = this.#y.asReadonly();
  protected readonly width = this.#w.asReadonly();
  protected readonly height = this.#h.asReadonly();

  protected readonly state = computed(() => (this.menu.activeTriggerHost() ? 'visible' : 'hidden'));

  constructor() {
    afterEveryRender(() => {
      const trigger = this.menu.activeTriggerHost();
      if (!trigger) return;
      const list = this.#host.parentElement;
      if (!list) return;
      const tr = trigger.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      this.#x.set(tr.left - lr.left);
      this.#y.set(tr.top - lr.top);
      this.#w.set(tr.width);
      this.#h.set(tr.height);
    });
  }
}
