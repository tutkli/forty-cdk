import { computed, Directive, ElementRef, inject } from '@angular/core';

import { registerHandle, hostId, resolveListNavigation, rovingTabStop } from 'forty-cdk/core';
import { injectStepperContext, injectStepperItemContext } from './stepper-context';

/**
 * Header for one step. In `mode="interactive"` carries `role="tab"`, participates
 * in the roving tabindex, and wires `aria-selected` / `aria-controls` /
 * `aria-disabled`. In `mode="progress"` carries `aria-current="step"` on the
 * active step only and is a static element (no tab-stop manipulation).
 *
 * Apply on a `<button type="button">` for interactive mode so Enter / Space
 * activation is native. A static element (`<span>`) is acceptable for progress
 * mode.
 *
 * Disabled triggers in interactive mode reflect `aria-disabled` + `data-disabled`
 * (never the native `disabled` attribute) and drop out of the Tab sequence
 * (`tabindex` `-1`), but REMAIN reachable by arrow navigation: focus lands on
 * them and activation is a no-op, so assistive tech announces them in both
 * browse and focus / interaction modes.
 */
@Directive({
  selector: '[forStepperTrigger]',
  exportAs: 'forStepperTrigger',
  host: {
    '[attr.role]': "ctx.mode() === 'interactive' ? 'tab' : null",
    '[id]': 'id()',
    '[attr.aria-selected]':
      "ctx.mode() === 'interactive' ? (item.current() ? 'true' : 'false') : null",
    '[attr.aria-controls]': "ctx.mode() === 'interactive' && item.current() ? controlsId() : null",
    '[attr.aria-current]': "ctx.mode() === 'progress' && item.current() ? 'step' : null",
    '[attr.aria-disabled]': "ctx.mode() === 'interactive' && !item.selectable() ? 'true' : null",
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'item.resolvedState()',
    '[attr.data-disabled]': 'item.effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'ctx.orientation()',
    '(click)': 'onClick()',
    '(focus)': 'onFocus()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForStepperTrigger {
  protected readonly ctx = injectStepperContext('ForStepperTrigger');
  protected readonly item = injectStepperItemContext('ForStepperTrigger');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Generated (or consumer-set static) id for this trigger. Used by content panels for `aria-labelledby`. */
  readonly id = hostId('for-stepper-trigger');

  /** Id of the content panel this trigger controls (the matching panel by step index). */
  protected readonly controlsId = computed(() => this.ctx.contentIdFor(this.item.index()));

  /**
   * APG tabindex cascade (interactive mode only). In progress mode returns
   * `null` so no tab-stop attribute is emitted. In interactive mode:
   * - `-1` when not selectable (disabled or unreachable in linear mode).
   * - Roving-tracker value once any trigger has been focused.
   * - `0` when this step is current.
   * - `-1` when another trigger owns the current step.
   * - `0` if this is the first selectable trigger (fallback entry point).
   * - `-1` otherwise.
   */
  protected readonly tabindex = computed<0 | -1 | null>(() => {
    if (this.ctx.mode() !== 'interactive') {
      return null;
    }
    return rovingTabStop({
      disabled: !this.item.selectable(),
      selected: this.item.current(),
      hasSelected: this.ctx.hasCurrentTrigger(),
      isFirstEnabled: this.ctx.isFirstSelectableTrigger(this.#host),
      roving: this.ctx.roving,
      host: this.#host,
    });
  });

  constructor() {
    const handle = {
      host: this.#host,
      index: this.item.index,
      id: this.id,
      selectable: this.item.selectable,
      disabled: computed(() => !this.item.selectable()),
    };
    registerHandle(
      handle,
      (h) => this.ctx.registerTrigger(h),
      (h) => this.ctx.unregisterTrigger(h),
    );
  }

  protected onClick(): void {
    if (this.ctx.mode() !== 'interactive' || !this.item.selectable()) {
      return;
    }
    this.item.select();
  }

  protected onFocus(): void {
    if (this.ctx.mode() !== 'interactive' || !this.item.selectable()) {
      return;
    }
    this.ctx.roving.setActive(this.#host);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.ctx.mode() !== 'interactive') {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.ctx.orientation(),
      dir: this.ctx.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.ctx.navigate(this.#host, action);
  }
}
