import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  type Signal,
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
 *
 * When a `[forNavigationMenuViewport]` is present in the menu, the host
 * element re-parents itself into the viewport on construction so all
 * active panels share a single animated surface (mega-menu pattern). The
 * directive does not undo the re-parent on destroy: the consumer's `@if`
 * is destroying the element anyway, and Angular's renderer removes nodes
 * by their actual current parent.
 *
 * `data-motion` is reflected (`from-start | from-end | to-start | to-end`)
 * for CSS keyframes that slide the entering and leaving panels together
 * during a transition.
 */
@Directive({
  selector: '[forNavigationMenuContent]',
  exportAs: 'forNavigationMenuContent',
  host: {
    '[id]': 'id()',
    '[attr.aria-labelledby]': 'triggerId()',
    '[attr.data-state]': 'menu.isOpen(value()) ? "open" : "closed"',
    '[attr.data-motion]': 'motion()',
    '(pointerenter)': 'menu.cancelPending()',
    '(pointerleave)': 'menu.scheduleClose("hover")',
    '(keydown.escape)': 'onEscape($any($event))',
  },
})
export class ForNavigationMenuContent {
  protected readonly menu = injectNavigationMenuContext('ForNavigationMenuContent');
  readonly #item = injectNavigationMenuItemContext('ForNavigationMenuContent');
  readonly #idGen = inject(IdGenerator);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly id = signal(this.#idGen.next('for-navigation-menu-content'));
  protected readonly value: Signal<string> = this.#item.value;
  protected readonly triggerId = computed(() => this.menu.triggerIdFor(this.value()));
  protected readonly motion = computed(() => this.menu.motionFor(this.value()));

  constructor() {
    const handle = {
      host: this.#host,
      value: this.value,
      id: this.id,
    };
    this.menu.registerContent(handle);
    inject(DestroyRef).onDestroy(() => this.menu.unregisterContent(handle));

    // Defer the re-parent until after the embedded view is attached to its
    // template anchor — Angular inserts root nodes AFTER directive
    // constructors run, so an `appendChild` here would be undone. Running
    // it in `afterNextRender` happens before browser paint, so the move is
    // not visible.
    afterNextRender(() => {
      const viewport = this.menu.viewport();
      if (viewport && viewport.host !== this.#host.parentElement) {
        viewport.host.appendChild(this.#host);
      }
    });
  }

  protected onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const v = this.value();
    this.menu.close();
    this.menu.focusTrigger(v);
  }
}
