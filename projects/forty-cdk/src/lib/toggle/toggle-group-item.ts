import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { FOR_HOST_ROVING_CONTEXT } from '../_internal/roving-tabindex/host-roving-context';
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
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForToggleGroupItem {
  protected readonly group = injectToggleGroupContext('ForToggleGroupItem');
  readonly #rovingHost = inject(FOR_HOST_ROVING_CONTEXT, { optional: true, skipSelf: true });
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / removed from the group's `value`. Required. */
  readonly value = input.required<string>();

  /** Per-item disabled (in addition to the group's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly pressed = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.group.disabled() || (this.#rovingHost?.disabled() ?? false),
  );

  /**
   * Tabindex per APG: once any item has been focused, the roving tracker owns
   * the tab stop so re-entry restores the last focused item; before that, fall
   * back to the entry point (first selected / first enabled). The roving host
   * is the toolbar when nested inside one, otherwise the group. Disabled items
   * are always -1.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    const owner = this.#rovingHost ?? this.group;
    if (owner.roving.active() !== null) {
      return owner.roving.tabindexFor(this.#host.nativeElement);
    }
    return owner.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const groupHandle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      groupHandle,
      (h) => this.group.registerItem(h),
      (h) => this.group.unregisterItem(h),
    );

    const rovingHost = this.#rovingHost;
    if (rovingHost) {
      const rovingHandle = {
        host: this.#host.nativeElement,
        disabled: this.effectiveDisabled,
      };
      registerHandle(
        rovingHandle,
        (h) => rovingHost.registerItem(h),
        (h) => rovingHost.unregisterItem(h),
      );
    }
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.toggle(this.value());
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const owner = this.#rovingHost ?? this.group;
    owner.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const owner = this.#rovingHost ?? this.group;
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
