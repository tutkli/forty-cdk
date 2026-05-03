import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTabsContext } from './tabs-context';

/**
 * Header button for one tab. Apply on a `<button type="button">` so Enter /
 * Space activation come from native button behavior.
 *
 * Tabindex follows APG: the user-focused trigger owns `tabindex=0` (tracked
 * by `RovingTabindex`); before any interaction, the selected trigger (or
 * first enabled, when nothing is selected) is the tab entry.
 */
@Directive({
  selector: '[forTabsTrigger]',
  exportAs: 'forTabsTrigger',
  host: {
    role: 'tab',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-controls]': 'controlsId()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'selected() ? "active" : "inactive"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForTabsTrigger {
  protected readonly group = injectTabsContext('ForTabsTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-tabs-trigger'));

  readonly selected = computed(() => this.group.isSelected(this.value()));
  readonly effectiveDisabled = computed(
    () => this.disabled() || this.group.disabled(),
  );

  protected readonly controlsId = computed(() => this.group.contentIdFor(this.value()));

  /**
   * APG tabindex: user-driven roving owns it once any trigger has been
   * focused. Before that, fall back to "selected, else first enabled".
   */
  protected readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    if (this.group.roving.active() !== null) {
      return this.group.roving.tabindexFor(this.#host.nativeElement);
    }
    if (this.selected()) {
      return 0;
    }
    if (this.group.value() !== '') {
      return -1;
    }
    return this.group.isFirstEnabledTrigger(this.#host.nativeElement) ? 0 : -1;
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      id: this.id,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    this.group.registerTrigger(handle);
    inject(DestroyRef).onDestroy(() => this.group.unregisterTrigger(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.select(this.value());
  }

  protected onFocus(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.group.roving.setActive(this.#host.nativeElement);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.group.orientation(),
      dir: this.group.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.group.navigate(this.#host.nativeElement, action);
  }
}
