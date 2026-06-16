import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { registerHandle } from '../_internal/collection/register-handle';
import {
  FOR_STEPPER_ITEM_CONTEXT,
  type ForStepperItemContext,
  type ForStepperItemHandle,
  injectStepperContext,
} from './stepper-context';

/**
 * One step within a `ForStepper`. Owns per-step state (`completed`, `optional`,
 * `disabled`, `hasError`, `state`) and exposes the `ForStepperItemContext` that
 * child `[forStepperTrigger]`, `[forStepperIndicator]`, and
 * `[forStepperSeparator]` directives consume.
 *
 * Apply on a list item element (e.g. `<li forStepperItem>`). The step's index
 * is derived reactively from its DOM position within the stepper via the root's
 * item collection.
 */
@Directive({
  selector: '[forStepperItem]',
  exportAs: 'forStepperItem',
  host: {
    '[attr.data-state]': 'resolvedState()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'ctx.orientation()',
  },
  providers: [{ provide: FOR_STEPPER_ITEM_CONTEXT, useExisting: ForStepperItem }],
})
export class ForStepperItem implements ForStepperItemContext, ForStepperItemHandle {
  protected readonly ctx = injectStepperContext('ForStepperItem');

  /** Host element — satisfies `ForStepperItemHandle.host` for collection registration. */
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Marks this step as successfully completed. */
  readonly completed = input(false, { transform: booleanAttribute });

  /** Marks this step as optional (can be skipped in linear mode). */
  readonly optional = input(false, { transform: booleanAttribute });

  /** When true, this step's trigger ignores clicks and the step is unreachable by keyboard. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** When true, the step reflects the `'error'` resolved state (unless it is current). */
  readonly hasError = input(false, { transform: booleanAttribute });

  /**
   * Custom state string override. When non-empty, wins over the derived resolved
   * state (`error`, `active`, `completed`, `pending`) and drives every
   * `data-state` attribute on this step.
   */
  readonly state = input<string | null>(null);

  /** Whether this step is disabled — own `disabled` OR the root stepper's `disabled`. */
  readonly effectiveDisabled = computed(() => this.disabled() || this.ctx.disabled());

  /** DOM-order index of this step within the stepper. */
  readonly index = computed(() => this.ctx.indexOf(this));

  /** True when this step is the currently selected step. */
  readonly current = computed(() => this.ctx.isCurrent(this.index()));

  /**
   * True when this step can be focused and activated. False when the step is
   * effectively disabled or not yet reachable in linear mode.
   */
  readonly selectable = computed(
    () => this.ctx.isReachable(this.index()) && !this.effectiveDisabled(),
  );

  /**
   * Resolved `data-state` string. Precedence:
   * 1. Custom `state()` when non-empty.
   * 2. `'error'` when `hasError()` and not current.
   * 3. `'active'` when current.
   * 4. `'completed'` when `completed()`.
   * 5. `'pending'` otherwise.
   */
  readonly resolvedState = computed<string>(() => {
    const custom = this.state();
    if (custom) {
      return custom;
    }
    if (this.hasError() && !this.current()) {
      return 'error';
    }
    if (this.current()) {
      return 'active';
    }
    if (this.completed()) {
      return 'completed';
    }
    return 'pending';
  });

  constructor() {
    registerHandle(
      this,
      (h) => this.ctx.registerItem(h),
      (h) => this.ctx.unregisterItem(h),
      'afterNextRender',
    );
  }

  /** Selects this step. Delegates to `ForStepperContext.select(index)`. */
  select(): void {
    this.ctx.select(this.index());
  }
}
