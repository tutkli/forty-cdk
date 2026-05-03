import { booleanAttribute, computed, Directive, input } from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  FOR_TOOLBAR_CONTEXT,
  type ForToolbarContext,
  type ForToolbarItemHandle,
} from './toolbar-context';

/**
 * Headless implementation of the
 * [WAI-ARIA Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).
 *
 * Hosts buttons, links, separators, and (optionally) a `[forToggleGroup]`
 * for grouped toggles. Manages roving tabindex across all interactive
 * children so the toolbar takes a single Tab stop and arrow keys move
 * focus inside.
 *
 * Composition with `ForToggleGroup` is automatic: items inside a
 * `[forToggleGroup]` whose ancestor is `[forToolbar]` register with the
 * toolbar's roving and use its keyboard navigation, so arrow keys move
 * fluidly across the whole bar.
 *
 * @example
 * ```html
 * <div forToolbar aria-label="Formatting">
 *   <button forToolbarButton>Undo</button>
 *   <button forToolbarButton>Redo</button>
 *   <span forToolbarSeparator></span>
 *   <div forToggleGroup multiple>
 *     <button forToggleGroupItem value="bold">B</button>
 *     <button forToggleGroupItem value="italic">I</button>
 *   </div>
 *   <span forToolbarSeparator></span>
 *   <a forToolbarLink href="/help">Help</a>
 * </div>
 * ```
 */
@Directive({
  selector: '[forToolbar]',
  exportAs: 'forToolbar',
  host: {
    role: 'toolbar',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir() === "rtl" ? "rtl" : null',
  },
  providers: [{ provide: FOR_TOOLBAR_CONTEXT, useExisting: ForToolbar }],
})
export class ForToolbar implements ForToolbarContext {
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly dir = input<WritingDirection>('ltr');
  readonly loop = input(true, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly #items = new Collection<ForToolbarItemHandle>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#items.items()));

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentItem);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    items[next]?.host.focus();
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    return this.#firstEnabledHost() === el;
  }

  registerItem(handle: ForToolbarItemHandle): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: ForToolbarItemHandle): void {
    this.#items.unregister(handle);
  }
}
