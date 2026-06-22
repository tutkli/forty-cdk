import { inject, InjectionToken, type Signal } from '@angular/core';

import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { RovingTabindex } from '../_internal/roving-tabindex/roving-tabindex';

/** Activation timing for interactive-mode arrow navigation. */
export type StepperActivationMode = 'automatic' | 'manual';

/** Accessibility model: interactive Tabs pattern vs display-only progress list. */
export type StepperMode = 'interactive' | 'progress';

/**
 * Registry entry for one step, owned by `ForStepperItem`. Drives index
 * derivation and linear gating.
 */
export interface ForStepperItemHandle {
  /** Host element, used for DOM-order sorting in the collection. */
  readonly host: HTMLElement;
  /** Whether this step has been marked as completed by the consumer. */
  readonly completed: Signal<boolean>;
  /** Whether this step can be skipped when the stepper is in linear mode. */
  readonly optional: Signal<boolean>;
  /** Whether this step is disabled (own `disabled` OR root `disabled`). */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether this step has an error condition. */
  readonly hasError: Signal<boolean>;
  /** The resolved `data-state` string for this step. */
  readonly resolvedState: Signal<string>;
}

/**
 * Registry entry for one trigger (roving participant and id source). Used by
 * the root to wire roving tabindex, id lookups, and navigation.
 */
export interface ForStepperTriggerHandle {
  /** Host element, used for DOM-order sorting and focus moves. */
  readonly host: HTMLElement;
  /** The trigger's own host id, for `aria-labelledby` on content panels. */
  readonly id: Signal<string>;
  /**
   * Whether this trigger can be focused and activated. `false` when the step
   * is disabled or not yet reachable in linear mode.
   */
  readonly selectable: Signal<boolean>;
  /**
   * Inverse of `selectable`. Required by `firstEnabledHost` and
   * `reconcileRovingActive`, which read a `disabled` signal per handle.
   */
  readonly disabled: Signal<boolean>;
}

/**
 * Registry entry for one content panel (id source; positional). The content's
 * position in this collection determines its associated step index.
 */
export interface ForStepperContentHandle {
  /** Host element, used for DOM-order sorting and index derivation. */
  readonly host: HTMLElement;
  /** The panel's own host id, for `aria-controls` on triggers. */
  readonly id: Signal<string>;
}

/**
 * Coordination contract owned by `ForStepper`. Triggers, items, and content
 * panels register here; navigation and selection flow back through these
 * methods.
 *
 * Implements the [WAI-ARIA Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
 * in `mode="interactive"` and a `<ol>`-based progress list with
 * `aria-current="step"` in `mode="progress"`.
 */
export interface ForStepperContext {
  /** Two-way bindable selected step index. */
  readonly selectedIndex: Signal<number>;
  /** When true, steps are only reachable after all preceding steps are completed or optional. */
  readonly linear: Signal<boolean>;
  /** Accessibility model — `'interactive'` (Tabs APG) or `'progress'` (progress list). */
  readonly mode: Signal<StepperMode>;
  /** Layout axis for the step list. */
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  /** Arrow-key activation timing when in interactive mode. */
  readonly activationMode: Signal<StepperActivationMode>;
  /** Resolved writing direction (`'ltr'` or `'rtl'`). */
  readonly dir: Signal<WritingDirection>;
  /** Whether the entire stepper is disabled. */
  readonly disabled: Signal<boolean>;
  /** Total number of registered step items. */
  readonly count: Signal<number>;
  /**
   * True when the stepper has reached the terminal completed state
   * (`selectedIndex()` >= `count()`).
   */
  readonly isCompleted: Signal<boolean>;
  /** Roving tabindex tracker for interactive-mode triggers. */
  readonly roving: RovingTabindex;

  /** Returns the DOM-order index of `item` in the item collection, or -1 if not found. */
  indexOf(item: ForStepperItemHandle): number;
  /** Returns true when `index` matches the currently selected step. */
  isCurrent(index: number): boolean;
  /**
   * Returns true when step `index` can be navigated to in linear mode. Index 0
   * is always reachable; subsequent steps require all preceding steps to be
   * completed or optional.
   */
  isReachable(index: number): boolean;
  /** Returns the resolved `data-state` string for step at `index`. */
  resolvedStateFor(index: number): string;
  /**
   * Selects step `index`. No-op when the root is disabled, when `index` is
   * out of range, or when the step is not reachable in linear mode.
   */
  select(index: number): void;
  /**
   * Advances to the next step, or into the terminal completed state when on
   * the last step. No-op when the root is disabled, when already in the terminal state, or
   * (in linear mode) when the current step is neither completed nor optional.
   */
  next(): void;
  /**
   * Retreats to the previous step. No-op when the root is disabled or the
   * first step is already selected. Bypasses the linear reachability gate —
   * going back always works.
   */
  previous(): void;
  /**
   * Returns true when the Next button can advance — including advancing the last
   * step into the terminal completed state. False when disabled, already in the
   * terminal state, or (in linear mode) the current step is not completed/optional.
   */
  canAdvance(): boolean;
  /** Returns true when the Previous button can retreat. False when disabled or at the first step. */
  canRetreat(): boolean;
  /**
   * Moves focus from `currentTrigger` according to `action` (interactive mode
   * only). In automatic activation mode, also selects the target step.
   * Disabled / unreachable triggers are skipped.
   */
  navigate(currentTrigger: HTMLElement, action: ListNavigationAction): void;

  /** Registers a step item handle into the item collection. */
  registerItem(h: ForStepperItemHandle): void;
  /** Unregisters a step item handle from the item collection. */
  unregisterItem(h: ForStepperItemHandle): void;
  /** Registers a trigger handle into the trigger collection. */
  registerTrigger(h: ForStepperTriggerHandle): void;
  /** Unregisters a trigger handle from the trigger collection and the roving tracker. */
  unregisterTrigger(h: ForStepperTriggerHandle): void;
  /** Registers a content panel handle into the content collection. */
  registerContent(h: ForStepperContentHandle): void;
  /** Unregisters a content panel handle from the content collection. */
  unregisterContent(h: ForStepperContentHandle): void;

  /**
   * Returns the id of the trigger at `index`, or `null` if there is no
   * registered trigger at that position.
   */
  triggerIdFor(index: number): string | null;
  /**
   * Returns the id of the content panel at `index`, or `null` if there is no
   * registered panel at that position.
   */
  contentIdFor(index: number): string | null;
  /**
   * Returns the DOM-order index of the content panel whose host is `host`, or
   * -1 if not registered. Used by `ForStepperContent` to derive its step index
   * reactively.
   */
  indexOfContent(host: HTMLElement): number;
  /**
   * True when `el` is the first selectable trigger (the roving entry-point
   * fallback when no step is selected or the roving pointer is stale).
   */
  isFirstSelectableTrigger(el: HTMLElement): boolean;
  /**
   * True when some registered trigger corresponds to the currently selected
   * step. Distinguishes "the current step owns the tab stop" from "the selected
   * index points at a missing or unreachable trigger" so the per-trigger
   * tabindex fallback can re-engage the first-selectable entry point.
   */
  hasCurrentTrigger(): boolean;
}

/**
 * Per-step state contract. Provided by `ForStepperItem`; consumed by
 * `ForStepperTrigger`, `ForStepperIndicator`, and `ForStepperSeparator`.
 */
export interface ForStepperItemContext {
  /** DOM-order index of this step within the stepper. */
  readonly index: Signal<number>;
  /** True when this step is the currently selected step. */
  readonly current: Signal<boolean>;
  /**
   * True when this step can be focused and activated (reachable and not
   * effectively disabled).
   */
  readonly selectable: Signal<boolean>;
  /** Whether this step has been marked as completed. */
  readonly completed: Signal<boolean>;
  /** Whether this step can be skipped when the stepper is in linear mode. */
  readonly optional: Signal<boolean>;
  /** Whether this step is disabled (own `disabled` OR root `disabled`). */
  readonly effectiveDisabled: Signal<boolean>;
  /** Whether this step has an error condition. */
  readonly hasError: Signal<boolean>;
  /** Resolved `data-state` string (precedence: custom state > error > active > completed > pending). */
  readonly resolvedState: Signal<string>;
  /**
   * Selects this step. Delegates to `ForStepperContext.select(index)` — the
   * linear reachability and disabled guards apply.
   */
  select(): void;
}

/** Injection token for the root stepper context (`ForStepper`). */
export const FOR_STEPPER_CONTEXT = new InjectionToken<ForStepperContext>('FOR_STEPPER_CONTEXT');

/** Injection token for the per-step item context (`ForStepperItem`). */
export const FOR_STEPPER_ITEM_CONTEXT = new InjectionToken<ForStepperItemContext>(
  'FOR_STEPPER_ITEM_CONTEXT',
);

export function injectStepperContext(piece: string): ForStepperContext {
  const ctx = inject(FOR_STEPPER_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/stepper] ${piece} must be used inside a [forStepper] element.`);
  }
  return ctx;
}

export function injectStepperItemContext(piece: string): ForStepperItemContext {
  const ctx = inject(FOR_STEPPER_ITEM_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/stepper] ${piece} must be used inside a [forStepperItem] element.`);
  }
  return ctx;
}
