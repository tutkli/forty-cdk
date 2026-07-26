import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { registerHandle, injectHasFocusableContent, hostId, hostLabelledBy } from 'forty-cdk/core';
import { injectStepperContext } from './stepper-context';

/**
 * Panel for one step. Pairs with a step through the explicit `[step]` index
 * when bound; otherwise by **position** — the Nth `[forStepperContent]` panel in
 * registration (DOM document) order corresponds to the Nth step. Bind `[step]`
 * whenever panels are conditionally rendered or ordered independently of the
 * steps, since the positional fallback renumbers the remaining panels.
 *
 * In `mode="interactive"` the panel carries `role="tabpanel"` and is a tab
 * stop (`tabindex="0"`) only when it has no focusable content of its own
 * (WAI-ARIA Tabs APG rule). In `mode="progress"` the panel carries
 * `role="group"` and is never a tab stop.
 *
 * While inactive the directive reflects `aria-hidden="true"` and `inert` so
 * mounted-but-inactive panels are removed from the accessibility tree and focus
 * order automatically. DOM presence is the consumer's responsibility — wrap
 * with `@if (current())` to unmount or leave mounted and toggle visibility with
 * CSS via `[data-state="inactive"]`.
 */
@Directive({
  selector: '[forStepperContent]',
  exportAs: 'forStepperContent',
  host: {
    '[attr.role]': "ctx.mode() === 'interactive' ? 'tabpanel' : 'group'",
    '[id]': 'id()',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-hidden]': 'current() ? null : "true"',
    '[attr.inert]': 'current() ? null : ""',
    '[attr.data-state]': 'current() ? "active" : "inactive"',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
})
export class ForStepperContent {
  protected readonly ctx = injectStepperContext('ForStepperContent');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Index of the step this panel belongs to. Leave unset (default `null`) to
   * pair by DOM-order position among the registered panels; bind it when panels
   * are conditionally rendered or ordered independently of the steps, so the
   * pairing survives a structurally absent panel.
   */
  readonly step = input<number | null>(null);

  /** Generated (or consumer-set static) id for this panel. Used by triggers for `aria-controls`. */
  readonly id = hostId('for-stepper-content');

  readonly #hasFocusableContent = injectHasFocusableContent();

  /** Resolved step index — the explicit `step()` when bound, else the positional fallback. */
  readonly index = computed(() => this.step() ?? this.ctx.indexOfContent(this.#host));

  /** True when this panel corresponds to the currently selected step. */
  readonly current = computed(() => this.ctx.isCurrent(this.index()));

  /**
   * Resolved `aria-labelledby`: a consumer-set static value when present, else
   * the id of the trigger that labels this panel.
   */
  protected readonly labelledBy = hostLabelledBy(() => this.ctx.triggerIdFor(this.index()));

  /**
   * APG tabindex: `'0'` only when in interactive mode and the panel has no
   * focusable content of its own, so screen-reader users can reach the panel
   * itself. A panel containing buttons / links / form controls gets no
   * `tabindex`, avoiding a redundant tab stop.
   */
  protected readonly tabindex = computed<'0' | null>(() => {
    if (this.ctx.mode() !== 'interactive') {
      return null;
    }
    return this.#hasFocusableContent() ? null : '0';
  });

  constructor() {
    const handle = { host: this.#host, index: this.index, id: this.id };
    registerHandle(
      handle,
      (h) => this.ctx.registerContent(h),
      (h) => this.ctx.unregisterContent(h),
    );
  }
}
