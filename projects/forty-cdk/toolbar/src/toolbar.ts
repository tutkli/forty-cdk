import { booleanAttribute, computed, Directive, inject, input } from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  type ListNavigationAction,
  type WritingDirection,
  nextEnabledHandle,
  FOR_HOST_ROVING_CONTEXT,
  RovingTabindex,
  injectTextDirection,
  hostAriaLabel,
} from 'forty-cdk/core';
import {
  FOR_TOOLBAR_CONTEXT,
  type ForToolbarContext,
  type ForToolbarItemHandle,
} from './toolbar-context';
import { FOR_TOOLBAR_DEFAULTS } from './toolbar-defaults';

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
    '[attr.aria-label]': 'resolvedAriaLabel()',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [
    { provide: FOR_TOOLBAR_CONTEXT, useExisting: ForToolbar },
    { provide: FOR_HOST_ROVING_CONTEXT, useExisting: FOR_TOOLBAR_CONTEXT },
  ],
})
export class ForToolbar implements ForToolbarContext {
  readonly #defaults = inject(FOR_TOOLBAR_DEFAULTS);

  /**
   * Manual `aria-label` for the toolbar. Use this when no visible label element
   * exists; otherwise prefer pointing `aria-labelledby` at one. A `null`
   * (default) or empty value emits no attribute. Matches the uniform labelling
   * input on `ForListbox` / `ForMenubar`.
   */
  readonly ariaLabel = input<string | null>(null);

  protected readonly resolvedAriaLabel = hostAriaLabel(() => this.ariaLabel() || null);

  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);
  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * item. Default `true`. The default is read from `provideForToolbarDefaults`
   * for the surrounding scope.
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Roving-tabindex tracker shared by every toolbar item (buttons, links, and
   * nested toggle-group items). Items promote themselves to active on
   * `(focus)` and read `active()` in their tabindex computed, so re-entry
   * (Shift+Tab back into the toolbar) restores the last focused item —
   * matching Tabs / Tree. Before any focus, `active()` is `null` and the
   * tabindex falls back to the first-enabled entry point.
   */
  readonly roving = new RovingTabindex(() => this.#items.items());

  readonly #items = new Collection<ForToolbarItemHandle>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#items.items()));

  navigate(currentItem: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const target = nextEnabledHandle(this.#items.items(), currentItem, action, {
      loop: this.loop(),
    });
    if (target === null) {
      return;
    }
    target.host.focus();
    target.host.scrollIntoView?.({ block: 'nearest' });
  }

  isFirstFocusableItem(el: HTMLElement): boolean {
    return this.#firstEnabledHost() === el;
  }

  registerItem(handle: ForToolbarItemHandle): void {
    this.#items.register(handle);
  }

  unregisterItem(handle: ForToolbarItemHandle): void {
    this.#items.unregister(handle);
    this.roving.unregister(handle.host);
  }
}
