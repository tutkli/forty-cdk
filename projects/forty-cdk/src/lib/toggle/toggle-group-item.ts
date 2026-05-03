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
import { FOR_TOOLBAR_CONTEXT } from '../toolbar/toolbar-context';
import { injectToggleGroupContext } from './toggle-group-context';

/**
 * One toggle button inside a `[forToggleGroup]`. Apply on a `<button>`.
 *
 * Pressed state is derived from the group's `value`. Click goes through
 * `group.toggle(value())` so single-vs-multiple semantics live in the
 * group, not the item.
 *
 * Roving tabindex: only one item is in the Tab sequence at a time
 * (the first selected, or the first enabled when nothing is pressed).
 * Arrow keys move focus inside the group; the consumer never has to
 * wire keyboard navigation manually.
 *
 * **Composition with [forToolbar]:** when the group is nested inside a
 * `[forToolbar]`, focus management is delegated to the toolbar — the
 * tabindex policy and arrow-key navigation flow across all toolbar items
 * (buttons, links, toggle items) instead of staying confined to the
 * group. Selection still lives on the group; only focus is shared.
 */
@Directive({
  selector: '[forToggleGroupItem]',
  exportAs: 'forToggleGroupItem',
  host: {
    type: 'button',
    '[attr.aria-pressed]': 'pressed() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'pressed() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForToggleGroupItem {
  protected readonly group = injectToggleGroupContext('ForToggleGroupItem');
  readonly #toolbar = inject(FOR_TOOLBAR_CONTEXT, { optional: true, skipSelf: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / removed from the group's `value`. Required. */
  readonly value = input.required<string>();

  /** Per-item disabled (in addition to the group's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly pressed = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.group.disabled() || (this.#toolbar?.disabled() ?? false),
  );

  /**
   * Tabindex per APG: 0 if this item is the current entry point (toolbar's
   * first-focusable when nested in a toolbar, otherwise the group's), -1
   * otherwise. Disabled items are always -1.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    const owner = this.#toolbar ?? this.group;
    return owner.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const groupHandle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    this.group.registerItem(groupHandle);

    const toolbarHandle = this.#toolbar
      ? { host: this.#host.nativeElement, disabled: this.effectiveDisabled }
      : null;
    if (this.#toolbar && toolbarHandle) {
      this.#toolbar.registerItem(toolbarHandle);
    }

    inject(DestroyRef).onDestroy(() => {
      this.group.unregisterItem(groupHandle);
      if (this.#toolbar && toolbarHandle) {
        this.#toolbar.unregisterItem(toolbarHandle);
      }
    });
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.toggle(this.value());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const owner = this.#toolbar ?? this.group;
    const action = resolveListNavigation(event, {
      orientation: owner.orientation(),
      dir: owner.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    owner.navigate(this.#host.nativeElement, action);
  }
}
