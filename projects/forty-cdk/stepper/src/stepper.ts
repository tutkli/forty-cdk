import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
} from '@angular/core';

import {
  Collection,
  firstEnabledHost,
  type ListNavigationAction,
  rovingListTarget,
  type WritingDirection,
  RovingTabindex,
  injectReflectedDirection,
  injectTextDirection,
  injectRovingFocusRestore,
} from 'forty-cdk/core';
import {
  FOR_STEPPER_CONTEXT,
  type ForStepperContentHandle,
  type ForStepperContext,
  type ForStepperItemHandle,
  type ForStepperTriggerHandle,
  type StepperActivationMode,
  type StepperMode,
} from './stepper-context';
import { FOR_STEPPER_DEFAULTS } from 'forty-cdk/defaults';

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
    '[attr.dir]': 'reflectedDir()',
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
   * Emits once each time `selectedIndex()` moves **into** the completed terminal
   * state, i.e. reaches `count()`. Does not re-emit while it stays completed;
   * retreating via `previous()` and re-entering emits again. A change to the step
   * list alone never emits: an emptied list is not completed, and a list shrinking
   * under `selectedIndex()` enters the completed state silently.
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
   * Whether arrow navigation wraps around past the first / last trigger.
   * Defaults to the value from `provideForStepperDefaults` for the
   * surrounding scope (library default: `true`).
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  /**
   * When true, all step triggers are non-interactive and the root carries
   * `data-disabled`.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Writing direction. When unset (default `null`), the inherited ambient direction is resolved
   * from the nearest ancestor carrying a `dir` attribute (or `<html dir>`), defaulting to `'ltr'`.
   * An explicit `[dir]` always wins. The resolved value is reflected to the host `dir` attribute
   * when a direction is set or declared, and swaps ArrowLeft / ArrowRight semantics in RTL.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);
  private readonly reflectedDir = injectReflectedDirection(this._dirInput);

  readonly roving = new RovingTabindex(() => this.#triggers.items(), { fallback: 'nearest' });

  readonly #items = new Collection<ForStepperItemHandle>();
  readonly #triggers = new Collection<ForStepperTriggerHandle>();
  readonly #contents = new Collection<ForStepperContentHandle>();

  /** Total number of registered step items. */
  readonly count = computed(() => this.#items.items().length);

  /**
   * True when the stepper is in the terminal **completed** state: it has at least
   * one step and `selectedIndex()` has reached `count()` (one past the last step). No step is current and every
   * `[forStepperContent]` panel is inactive while this holds.
   */
  readonly isCompleted = computed(() => {
    const count = this.count();
    return count > 0 && this.selectedIndex() >= count;
  });

  readonly #firstSelectableTriggerHost = computed(() => firstEnabledHost(this.#triggers.items()));

  /**
   * Whether a trigger has been focused since the selection last changed. While it holds, the roving
   * pointer owns the tab stop; every selection change resets it, so the tab stop returns to the
   * current step however the selection moved.
   */
  readonly #triggerFocusedSinceSelection = linkedSignal({
    source: this.selectedIndex,
    computation: () => false,
  });

  /**
   * Index of the last step every preceding step admits: the first step that is neither completed
   * nor optional in linear mode, `count()` when there is none, unbounded outside linear mode.
   */
  readonly #reachableLimit = computed(() => {
    if (!this.linear()) {
      return Infinity;
    }
    const items = this.#items.items();
    const blocking = items.findIndex((item) => !item.completed() && !item.optional());
    return blocking === -1 ? items.length : blocking;
  });

  /** The nearest index after the current one that Next may land on, or `null` when none exists. */
  readonly #nextStop = computed<number | null>(() => {
    if (this.disabled()) {
      return null;
    }
    const count = this.count();
    for (let i = this.selectedIndex() + 1; i <= count && this.isReachable(i); i++) {
      if (this.#canLandOn(i)) {
        return i;
      }
    }
    return null;
  });

  /** The nearest earlier step that is not disabled, or `null` when none exists. */
  readonly #previousStop = computed<number | null>(() => {
    if (this.disabled()) {
      return null;
    }
    const items = this.#items.items();
    for (let i = Math.min(this.selectedIndex(), items.length) - 1; i >= 0; i--) {
      if (items[i]?.effectiveDisabled() === false) {
        return i;
      }
    }
    return null;
  });

  constructor() {
    injectRovingFocusRestore(this.roving);
    let previous: { completed: boolean; index: number } | null = null;
    effect(() => {
      const current = { completed: this.isCompleted(), index: this.selectedIndex() };
      if (
        previous !== null &&
        current.completed &&
        !previous.completed &&
        current.index !== previous.index
      ) {
        this.complete.emit();
      }
      previous = current;
    });
  }

  indexOf(item: ForStepperItemHandle): number {
    return this.#items.items().indexOf(item);
  }

  isCurrent(index: number): boolean {
    return this.selectedIndex() === index;
  }

  isReachable(index: number): boolean {
    return index <= this.#reachableLimit();
  }

  resolvedStateFor(index: number): string {
    return this.#items.items()[index]?.resolvedState() ?? 'pending';
  }

  private focusTrigger(host: HTMLElement, selectable: boolean): void {
    if (selectable) {
      this.roving.setActive(host);
    }
    this.#triggerFocusedSinceSelection.set(true);
  }

  private rovingOwnsTabStop(): boolean {
    return this.#triggerFocusedSinceSelection();
  }

  private completedFor(index: number): boolean {
    return this.#items.items()[index]?.completed() ?? false;
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
    if (!this.#canLandOn(clamped)) {
      return;
    }
    this.selectedIndex.set(clamped);
  }

  next(): void {
    const target = this.#nextStop();
    if (target !== null) {
      this.selectedIndex.set(target);
    }
  }

  previous(): void {
    const target = this.#previousStop();
    if (target !== null) {
      this.selectedIndex.set(target);
    }
  }

  canAdvance(): boolean {
    return this.#nextStop() !== null;
  }

  canRetreat(): boolean {
    return this.#previousStop() !== null;
  }

  /**
   * Whether the selection may land on `index`: the terminal `count()` once every step admits it,
   * otherwise a registered step that is reachable and not effectively disabled.
   */
  #canLandOn(index: number): boolean {
    if (!this.isReachable(index)) {
      return false;
    }
    if (index === this.count()) {
      return true;
    }
    return this.#items.items()[index]?.effectiveDisabled() === false;
  }

  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
      return;
    }
    const triggers = this.#triggers.items();
    const target = rovingListTarget(triggers, currentTrigger, action, { loop: this.loop() });
    if (!target) {
      return;
    }
    target.host.focus();
    if (this.activationMode() === 'automatic' && target.selectable()) {
      this.selectedIndex.set(target.index());
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
    return this.#triggerForStep(index)?.id() ?? null;
  }

  contentIdFor(index: number): string | null {
    return this.#contentForStep(index)?.id() ?? null;
  }

  indexOfContent(host: HTMLElement): number {
    return this.#contents.indexOfHost(host);
  }

  isFirstSelectableTrigger(el: HTMLElement): boolean {
    return this.#firstSelectableTriggerHost() === el;
  }

  hasCurrentTrigger(): boolean {
    return this.#triggerForStep(this.selectedIndex())?.selectable() ?? false;
  }

  #triggerForStep(index: number): ForStepperTriggerHandle | undefined {
    return this.#triggers.items().find((t) => t.index() === index);
  }

  #contentForStep(index: number): ForStepperContentHandle | undefined {
    return this.#contents.items().find((c) => c.index() === index);
  }
}
