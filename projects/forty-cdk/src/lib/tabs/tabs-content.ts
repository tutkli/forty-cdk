import { computed, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
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
 * APG: when the panel does not contain focusable content, it must itself
 * be focusable so SR users can read it. We always set `tabindex=0` for
 * v1 — refine later if a `[interactiveContent]` opt-out is justified.
 */
@Directive({
  selector: '[forTabsContent]',
  exportAs: 'forTabsContent',
  host: {
    role: 'tabpanel',
    tabindex: '0',
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
  readonly #idGen = inject(IdGenerator);

  readonly value = input.required<string>();

  readonly id = signal(this.#idGen.next('for-tabs-content'));

  readonly selected = computed(() => this.group.isSelected(this.value()));
  protected readonly labelledBy = computed(() => this.group.triggerIdFor(this.value()));

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const handle = { host, id: this.id, value: this.value };
    this.group.registerContent(handle);
    inject(DestroyRef).onDestroy(() => this.group.unregisterContent(handle));
  }
}
