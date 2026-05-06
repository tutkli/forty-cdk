import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectMenuContext } from './menu-context';

/**
 * The `menuitem` inside the parent menu that opens its `[forMenuSub]`.
 * Apply on a `<button>` so Space / Enter dispatch native click events that
 * toggle the submenu via `(click)`.
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, and `aria-controls`
 * pointing to the submenu's content. Registers itself as a `menuitem` in
 * the **parent** menu's collection (so parent navigation reaches it),
 * while reading open state from the **submenu**.
 *
 * Keyboard:
 * - **Click / Enter / Space** — toggle the submenu (focus first item on open).
 * - **ArrowRight (LTR) / ArrowLeft (RTL)** — open the submenu and focus its first item.
 * - **ArrowDown / ArrowUp / Home / End** — navigate parent's items.
 * - **ArrowLeft (LTR) / ArrowRight (RTL)** — when the parent menu is itself
 *   a submenu, close the parent (return to grandparent's trigger). No-op at
 *   the top level.
 * - **Tab** — close the entire menu chain.
 * - **Typeahead** — printable keys delegate to parent's typeahead.
 */
@Directive({
  selector: '[forMenuSubTrigger]',
  exportAs: 'forMenuSubTrigger',
  host: {
    role: 'menuitem',
    type: 'button',
    tabindex: '-1',
    '[id]': 'submenu.triggerId()',
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'submenu.open() ? "true" : "false"',
    '[attr.aria-controls]': 'submenu.open() ? submenu.contentId() : null',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.data-state]': 'submenu.open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForMenuSubTrigger {
  protected readonly submenu = injectMenuContext('ForMenuSubTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly effectiveDisabled = computed(() => this.disabled() || this.submenu.disabled());

  constructor() {
    if (!this.submenu.parentMenu) {
      throw new Error(
        '[forty-cdk/menu] [forMenuSubTrigger] must be inside a [forMenuSub] inside a parent menu.',
      );
    }
    const parent = this.submenu.parentMenu;
    const handle = {
      host: this.#host.nativeElement,
      disabled: this.effectiveDisabled,
    };
    parent.registerItem(handle);
    this.submenu.registerTrigger(this.#host.nativeElement);
    inject(DestroyRef).onDestroy(() => {
      parent.unregisterItem(handle);
      this.submenu.unregisterTrigger(this.#host.nativeElement);
    });
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.submenu.toggle('first');
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const parent = this.submenu.parentMenu!;
    const isRtl = this.submenu.dir() === 'rtl';
    const openKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const closeParentKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === openKey) {
      event.preventDefault();
      this.submenu.openMenu('first');
      return;
    }

    // Close-parent key when the *parent* is itself a submenu: collapse the parent.
    if (event.key === closeParentKey && parent.parentMenu) {
      event.preventDefault();
      parent.closeMenu('escape');
      return;
    }

    const action = resolveListNavigation(event, { orientation: 'vertical' });
    if (action) {
      event.preventDefault();
      parent.navigate(this.#host.nativeElement, action);
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      parent.closeMenu('tab');
      return;
    }

    parent.handleTypeahead(event);
  }
}
