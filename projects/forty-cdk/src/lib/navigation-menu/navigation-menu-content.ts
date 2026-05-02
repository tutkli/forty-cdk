import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Signal,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  injectNavigationMenuContext,
  injectNavigationMenuItemContext,
} from './navigation-menu-context';

/**
 * The disclosure panel for a navigation-menu item. Mounted via `@if`
 * (consumer drives it from `forNavigationMenu.value()` or
 * `forNavigationMenuItem`'s state) so animations work natively.
 *
 * Carries `aria-labelledby` pointing at the trigger and reflects
 * `data-state` for CSS hooks. No focus management is imposed — content
 * is a regular landmark; Tab moves through links inside, then out to the
 * next focusable element after the wrapper.
 */
@Directive({
  selector: '[forNavigationMenuContent]',
  exportAs: 'forNavigationMenuContent',
  host: {
    '[id]': 'id()',
    '[attr.aria-labelledby]': 'triggerId()',
    '[attr.data-state]': 'menu.isOpen(value()) ? "open" : "closed"',
    '(keydown.escape)': 'onEscape($any($event))',
  },
})
export class ForNavigationMenuContent {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuContent');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuContent');
  readonly #idGen = inject(IdGenerator);

  readonly id = signal(this.#idGen.next('for-navigation-menu-content'));
  protected readonly value: Signal<string> = this.#item.value;
  protected readonly triggerId = computed(() => this.menu.triggerIdFor(this.value()));

  constructor() {
    const handle = { host: inject<ElementRef<HTMLElement>>(ElementRef).nativeElement, value: this.value, id: this.id };
    this.menu.registerContent(handle);
    inject(DestroyRef).onDestroy(() => this.menu.unregisterContent(handle));
  }

  protected onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const v = this.value();
    this.menu.close();
    this.menu.focusTrigger(v);
  }
}
