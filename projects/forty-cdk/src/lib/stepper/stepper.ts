import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';

import { Collection } from '../_internal/collection/collection';
import { firstEnabledHost } from '../_internal/collection/first-enabled-host';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { reconcileRovingActive } from '../_internal/roving-tabindex/reconcile-roving-active';
import { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  FOR_STEPPER_CONTEXT,
  type ForStepperContentHandle,
  type ForStepperContext,
  type ForStepperItemHandle,
  type ForStepperTriggerHandle,
  type StepperActivationMode,
  type StepperMode,
} from './stepper-context';
import { FOR_STEPPER_DEFAULTS } from './stepper-defaults';

/**
 * Root of the Stepper primitive. Owns the selected step index, linear
 * progression, accessibility mode, orientation, and disabled state. Provides
 * the shared context to descendant directives.
 *
 * Implements the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
 * in `mode="interactive"` (roving tabindex, `role="tablist"`, `aria-selected`)
 * and an ordered-list progress pattern with `aria-current="step"` in
 * `mode="progress"`.
 *
 * `activationMode='manual'` (default): arrow navigation only moves focus;
 * Space / Enter activates. Recommended for wizards where step activation
 * triggers validation. `activationMode='automatic'`: arrow navigation moves
 * focus AND selects the step.
 */
@Directive({
  selector: '[forStepper]',
  exportAs: 'forStepper',
  host: {
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-mode]': 'mode()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_STEPPER_CONTEXT, useExisting: ForStepper }],
})
export class ForStepper implements ForStepperContext {
  readonly #defaults = inject(FOR_STEPPER_DEFAULTS);

  /**
   * Two-way bindable selected step index in the inclusive range `0 … count`.
   * Defaults to `0`. The terminal value `=== count()` (one past the last step) is
   * the **completed** state (see `isCompleted` / `complete`). The `model()` change
   * emitter (`(selectedIndexChange)`) fires only on internal selection changes
   * (trigger click, Next/Previous, automatic-mode arrow navigation), never on
   * consumer writes via `[(selectedIndex)]`.
   */
  readonly selectedIndex = model<number>(0);

  /**
   * Emits once each time the stepper transitions **into** the completed terminal
   * state — i.e. when `selectedIndex()` reaches `count()`. Does not re-emit while
   * it stays completed; retreating via `previous()` and re-entering emits again.
   */
  readonly complete = output<void>();

  /**
   * When true, steps are only reachable after all preceding steps are completed
   * or optional. Navigating back (`previous()`) always works regardless of this
   * flag.
   */
  readonly linear = input(false, { transform: booleanAttribute });

  /**
   * Accessibility model. `'interactive'` (default): full WAI-ARIA Tabs pattern
   * — `role="tablist"`, `role="tab"`, `role="tabpanel"`, roving tabindex, arrow
   * navigation. `'progress'`: ordered list with `aria-current="step"` on the
   * active trigger — no tab stop manipulation.
   */
  readonly mode = input<StepperMode>('interactive');

  /**
   * Layout axis for the step list. Affects `aria-orientation` on the list and
   * which arrow keys navigate in interactive mode.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');

  /**
   * Arrow-key activation timing in interactive mode. Defaults to the value from
   * `provideForStepperDefaults` for the surrounding scope (library default:
   * `'manual'`).
   */
  readonly activationMode = input<StepperActivationMode>(this.#defaults.activationMode);

  /**
   * Whether arrow navigation wraps around past the first / last selectable
   * trigger. Defaults to the value from `provideForStepperDefaults` for the
   * surrounding scope (library default: `true`).
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  /**
   * When true, all step triggers are non-interactive and the root carries
   * `data-disabled`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute and swaps
   * ArrowLeft / ArrowRight semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  readonly roving = new RovingTabindex();

  readonly #items = new Collection<ForStepperItemHandle>();
  readonly #triggers = new Collection<ForStepperTriggerHandle>();
  readonly #contents = new Collection<ForStepperContentHandle>();

  /** Total number of registered step items. */
  readonly count = computed(() => this.#items.items().length);

  /**
   * True when the stepper is in the terminal **completed** state: `selectedIndex()`
   * has reached `count()` (one past the last step). No step is current and every
   * `[forStepperContent]` panel is inactive while this holds.
   */
  readonly isCompleted = computed(() => this.selectedIndex() >= this.count());

  readonly #firstSelectableTriggerHost = computed(() =>
    firstEnabledHost(this.#triggers.items()),
  );

  constructor() {
    reconcileRovingActive(this.roving, this.#triggers.items);

    let wasCompleted = this.isCompleted();
    effect(() => {
      const completed = this.isCompleted();
      if (completed && !wasCompleted) {
        this.complete.emit();
      }
      wasCompleted = completed;
    });
  }

  indexOf(item: ForStepperItemHandle): number {
    return this.#items.items().indexOf(item);
  }

  isCurrent(index: number): boolean {
    return this.selectedIndex() === index;
  }

  isReachable(index: number): boolean {
    if (!this.linear()) {
      return true;
    }
    if (index === 0) {
      return true;
    }
    const items = this.#items.items();
    for (let i = 0; i < index; i++) {
      const item = items[i];
      if (!item || (!item.completed() && !item.optional())) {
        return false;
      }
    }
    return true;
  }

  resolvedStateFor(index: number): string {
    return this.#items.items()[index]?.resolvedState() ?? 'pending';
  }

  select(index: number): void {
    if (this.disabled()) {
      return;
    }
    const count = this.count();
    if (count === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(index, count));
    if (!this.isReachable(clamped)) {
      return;
    }
    this.selectedIndex.set(clamped);
  }

  next(): void {
    if (!this.canAdvance()) {
      return;
    }
    this.selectedIndex.set(this.selectedIndex() + 1);
  }

  previous(): void {
    if (this.disabled() || this.selectedIndex() <= 0) {
      return;
    }
    this.selectedIndex.set(this.selectedIndex() - 1);
  }

  canAdvance(): boolean {
    if (this.disabled() || this.selectedIndex() >= this.count()) {
      return false;
    }
    if (!this.linear()) {
      return true;
    }
    const current = this.#items.items()[this.selectedIndex()];
    return (current?.completed() ?? false) || (current?.optional() ?? false);
  }

  canRetreat(): boolean {
    return this.selectedIndex() > 0 && !this.disabled();
  }

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const triggers = this.#triggers.items();
    if (triggers.length === 0) {
      return;
    }
    const currentIndex = triggers.findIndex((t) => t.host === currentTrigger);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, triggers.length, action, {
      loop: this.loop(),
      isDisabled: (i) => !triggers[i]!.selectable(),
    });
    if (next === null) {
      return;
    }
    const target = triggers[next];
    if (!target) {
      return;
    }
    target.host.focus();
    if (this.activationMode() === 'automatic') {
      this.selectedIndex.set(next);
    }
  }

  registerItem(h: ForStepperItemHandle): void {
    this.#items.register(h);
  }

  unregisterItem(h: ForStepperItemHandle): void {
    this.#items.unregister(h);
  }

  registerTrigger(h: ForStepperTriggerHandle): void {
    this.#triggers.register(h);
  }

  unregisterTrigger(h: ForStepperTriggerHandle): void {
    this.#triggers.unregister(h);
    this.roving.unregister(h.host);
  }

  registerContent(h: ForStepperContentHandle): void {
    this.#contents.register(h);
  }

  unregisterContent(h: ForStepperContentHandle): void {
    this.#contents.unregister(h);
  }

  triggerIdFor(index: number): string | null {
    return this.#triggers.items()[index]?.id() ?? null;
  }

  contentIdFor(index: number): string | null {
    return this.#contents.items()[index]?.id() ?? null;
  }

  indexOfContent(host: HTMLElement): number {
    return this.#contents.indexOfHost(host);
  }

  isFirstSelectableTrigger(el: HTMLElement): boolean {
    return this.#firstSelectableTriggerHost() === el;
  }

  hasCurrentTrigger(): boolean {
    const idx = this.selectedIndex();
    const triggers = this.#triggers.items();
    if (idx < 0 || idx >= triggers.length) {
      return false;
    }
    const trigger = triggers[idx];
    return trigger !== undefined && trigger.selectable();
  }
}
