import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, hostId, resolveListNavigation, rovingTabStop } from 'forty-cdk/core';
import { injectTabsContext } from './tabs-context';

/**
 * Header button for one tab. Apply on a `<button type="button">` so Enter /
 * Space activation come from native button behavior.
 *
 * Tabindex follows APG: the user-focused trigger owns `tabindex=0` (tracked
 * by `RovingTabindex`); before any interaction, the selected trigger (or
 * first enabled, when nothing is selected) is the tab entry.
 *
 * `aria-controls` is emitted whenever a matching panel is registered — APG
 * emits it on every tab, which for the keep-mounted default means every
 * trigger. For consumers who unmount inactive panels via `@if (selected())`
 * it collapses to only the mounted trigger, so the reference never dangles at
 * an absent panel either way.
 */
@Directive({
  selector: '[forTabsTrigger]',
  exportAs: 'forTabsTrigger',
  host: {
    role: 'tab',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-selected]': 'selected() ? "true" : "false"',
    '[attr.aria-controls]': 'controlsId()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
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

  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = hostId('for-tabs-trigger');

  readonly selected = computed(() => this.group.isSelected(this.value()));
  readonly effectiveDisabled = computed(() => this.disabled() || this.group.disabled());

  protected readonly controlsId = computed(() => this.group.contentIdFor(this.value()));

  /**
   * APG tabindex: user-driven roving owns it once any trigger has been
   * focused. Before that, fall back to "selected, else first enabled".
   */
  protected readonly tabindex = computed<-1 | 0>(() =>
    rovingTabStop({
      disabled: this.effectiveDisabled(),
      selected: this.selected(),
      hasSelected: this.group.hasSelectedTrigger(),
      isFirstEnabled: this.group.isFirstEnabledTrigger(this.#host.nativeElement),
      roving: this.group.roving,
      host: this.#host.nativeElement,
    }),
  );

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      id: this.id,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    // Defer registration so `input.required` is bound by the time the parent
    // ever reads `handle.value()` from `triggerIdFor` / `contentIdFor` — both
    // are evaluated during host-binding CD passes that can interleave with
    // sibling triggers' input-binding step. Eager registration in the
    // constructor used to hit the not-yet-bound throw, papered over by a
    // `try/catch` in the parent. `afterNextRender` runs after every directive
    // in the current pass has had its inputs bound, which makes the lookup
    // deterministic. `unregisterTrigger` is reference-based, so it's a no-op
    // when destroy fires before the deferred register did.
    registerHandle(
      handle,
      (h) => this.group.registerTrigger(h),
      (h) => this.group.unregisterTrigger(h),
      'afterNextRender',
    );
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
