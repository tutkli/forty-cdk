import { booleanAttribute, computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, injectHasFocusableContent, hostId } from 'forty-cdk/core';
import { injectTabsContext } from './tabs-context';

/**
 * Panel for one tab. The directive does not manage DOM presence — leave the
 * panel mounted (idiomatic for tabs, preserves scroll/input state across
 * activations) and either toggle visibility in CSS via
 * `[data-state="inactive"]` or wrap with `@if (selected())` to unmount it.
 * While inactive, the directive reflects `aria-hidden="true"` and `inert`
 * so the mounted-but-inactive panel is removed from the accessibility tree
 * and focus order automatically.
 *
 * APG: a `tabpanel` is a tab stop (`tabindex="0"`) **only** when it has no
 * focusable content of its own — that lets screen-reader users reach an
 * otherwise-unreachable panel, while a panel that already contains a form,
 * links, or buttons does not add a redundant tab stop. The directive detects
 * focusable descendants automatically (reactive to subtree changes); set
 * `[interactiveContent]` to override the detection in either direction.
 */
@Directive({
  selector: '[forTabsContent]',
  exportAs: 'forTabsContent',
  host: {
    role: 'tabpanel',
    '[attr.tabindex]': 'tabindex()',
    '[id]': 'id()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-hidden]': 'selected() ? null : "true"',
    '[attr.inert]': 'selected() ? null : ""',
    '[attr.data-state]': 'selected() ? "active" : "inactive"',
    '[attr.data-orientation]': 'group.orientation()',
  },
})
export class ForTabsContent {
  protected readonly group = injectTabsContext('ForTabsContent');

  readonly value = input.required<string>();

  /**
   * Overrides the automatic focusable-content detection that drives the
   * panel's `tabindex`. Leave unset (default `null`) to let the directive
   * decide: a panel with no focusable descendants gets `tabindex="0"` so it
   * is reachable by Tab, a panel with focusable descendants gets none. Set
   * `true` when the panel always holds its own focusable content (skip the
   * extra tab stop without paying for detection); set `false` to force the
   * panel to be a tab stop regardless of its content.
   */
  readonly interactiveContent = input<boolean | null, unknown>(null, {
    transform: (value: unknown) => (value == null ? null : booleanAttribute(value)),
  });

  readonly id = hostId('for-tabs-content');

  readonly #hasFocusableContent = injectHasFocusableContent();

  readonly selected = computed(() => this.group.isSelected(this.value()));
  protected readonly labelledBy = computed(() => this.group.triggerIdFor(this.value()));

  /**
   * APG tabindex: `0` only when the panel has no focusable content of its
   * own, so SR users can focus the panel itself; otherwise no `tabindex`
   * attribute, so the panel does not add a redundant tab stop. An explicit
   * `interactiveContent` wins over the automatic detection.
   */
  protected readonly tabindex = computed<'0' | null>(() => {
    const override = this.interactiveContent();
    const interactive = override ?? this.#hasFocusableContent();
    return interactive ? null : '0';
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const handle = { host, id: this.id, value: this.value };
    // Mirror of the registration ordering in `ForTabsTrigger`. Defer until
    // input bindings have settled so the parent's `triggerIdFor` /
    // `contentIdFor` can read `handle.value()` without the not-yet-bound
    // throw. `unregisterContent` is reference-based and tolerant of being
    // called before the deferred register.
    registerHandle(
      handle,
      (h) => this.group.registerContent(h),
      (h) => this.group.unregisterContent(h),
      'afterNextRender',
    );
  }
}
