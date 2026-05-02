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
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForToggleGroupItem {
  readonly #group = injectToggleGroupContext('ForToggleGroupItem');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Identifier added to / removed from the group's `value`. Required. */
  readonly value = input.required<string>();

  /** Per-item disabled (in addition to the group's `disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly pressed = computed(() => this.#group.isSelected(this.value()));

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.#group.disabled(),
  );

  /**
   * Tabindex per APG toolbar: 0 if this item is the group's current entry
   * point (first selected, or first enabled when nothing is selected); -1
   * otherwise. Disabled items are always -1.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    return this.#group.isFirstFocusableItem(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    this.#group.registerItem(handle);
    inject(DestroyRef).onDestroy(() => this.#group.unregisterItem(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#group.toggle(this.value());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.#group.orientation(),
      dir: this.#group.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.#group.navigate(this.#host.nativeElement, action);
  }
}
