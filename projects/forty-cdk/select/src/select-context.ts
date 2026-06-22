import { computed, inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  type CollectionHandle,
  type FloatingAlign,
  type FloatingSide,
  type ListNavigationAction,
  type WritingDirection,
  type VetoableNativeEvent,
} from 'forty-cdk/core';

/**
 * Why a select requested close. Mirrors the menu primitive vocabulary so
 * downstream code that switches on close reasons stays consistent.
 */
export type ForSelectCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Where focus lands when the listbox opens. `'selected'` snaps to the first
 * currently-selected enabled option (matches native `<select>`); falls back
 * to `'first'` if no selection is enabled.
 */
export type ForSelectInitialFocus = 'first' | 'last' | 'selected';

/**
 * Handle every `[forSelectOption]` registers with the root. The collection
 * orders entries by DOM document order so groups, separators, and `@for`
 * loops don't perturb keyboard navigation.
 *
 * Generic over the option value type `T` (default `unknown` at the contract
 * level; `string` at the public root). The handle carries the raw value so
 * the root can match it against `value()` via `isItemEqualToValue`.
 */
export interface ForSelectOptionHandle<T = unknown> extends CollectionHandle {
  readonly value: Signal<T>;
  /**
   * The option's resolved display label as a reactive `Signal<string>` — the
   * trimmed `textContent` of the host. The root folds it into a persisted
   * snapshot so `selectedLabels` and closed-state typeahead resolve labels
   * without peeking at `textContent` from inside a `computed`.
   */
  readonly label: Signal<string>;
  readonly disabled: Signal<boolean>;
  /** Stable host `id` — the activedescendant target in the virtualized path. */
  readonly id: Signal<string>;
  /**
   * Zero-based absolute position in the full source data. Required in the
   * virtualized path (drives the position snapshot + `aria-posinset`); `null`
   * outside it.
   */
  readonly posInSet: Signal<number | null>;
}

/**
 * Coordination contract owned by `[forSelect]`. Trigger, content, value,
 * options, groups and separators all inject this token to read state and
 * delegate behavior — they don't import the root class directly.
 *
 * Generic over the option value type `T` (default `string` at the public
 * root). When a consumer binds object items the directive infers `T` from
 * `[(value)]` and the per-piece signatures specialize accordingly. Items are
 * compared via the consumer-provided `isItemEqualToValue` and serialized for
 * the form's hidden inputs via `itemToFormValue`; option text labels are
 * still read from the rendered `textContent`.
 */
export interface ForSelectContext<T = unknown> {
  readonly value: ModelSignal<readonly T[]>;
  readonly open: ModelSignal<boolean>;
  readonly multiple: Signal<boolean>;

  /**
   * The select's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Trigger and options read this so a
   * disabled select (or fieldset) is inert and exposes `aria-disabled`.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;

  /**
   * When `true`, the listbox is a trapped / inert / scroll-locked modal
   * surface (routed through `_internal/modal-shell`) instead of the anchored
   * popover. Read once when `[forSelectContent]` mounts; all anchored-
   * positioning state below is a no-op while modal.
   */
  readonly modal: Signal<boolean>;
  readonly dismissible: Signal<boolean>;
  readonly returnFocus: Signal<boolean>;
  /**
   * Positioning algorithm. `'popper'` (default) is standard floating-ui
   * anchored placement; `'item-aligned'` overlays the listbox so the
   * selected option's center aligns with the trigger's center (macOS-style
   * native `<select>`). All `side`/`align`/`*Offset`/`sticky`/
   * `hideWhenDetached`/`clipUntilPositioned`/`avoidCollisions` inputs are no-ops in
   * `'item-aligned'` mode (only `collisionPadding` is honored).
   */
  readonly position: Signal<'popper' | 'item-aligned'>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly selectionFollowsFocus: Signal<boolean>;
  readonly placeholder: Signal<string>;

  /** Where focus should land after the content mounts. Triggers set this before flipping `open`. */
  readonly initialFocus: Signal<ForSelectInitialFocus>;
  setInitialFocus(target: ForSelectInitialFocus): void;

  readonly triggerId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

  /** Compare two items for equality. Defaults to `===`; overridden for object values. */
  readonly isItemEqualToValue: Signal<(a: T, b: T) => boolean>;
  /** Serialize an item for the hidden input's `value` attribute. Defaults to `String(item)`. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * `[forSelectAnchor]` when registered, otherwise falls back to the trigger.
   * Decoupled from `trigger` so the trigger keeps driving `aria-controls`,
   * the click toggle, focus return, and its outside-pointer exemption
   * regardless of where the listbox paints.
   */
  readonly anchor: Signal<ReferenceElement | null>;
  /** The button trigger — exempt from outside-pointer checks and the focus-return target. */
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /**
   * Register / unregister an optional `[forSelectAnchor]` positioning element.
   * At most one anchor per root; a second registration throws. Reference-based
   * unregister, so an anchor torn down inside `@if` restores the trigger
   * fallback cleanly.
   */
  registerAnchor(el: HTMLElement): void;
  unregisterAnchor(el: HTMLElement): void;

  /** The mounted `[forSelectContent]` element. */
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  registerOption(handle: ForSelectOptionHandle<T>): void;
  unregisterOption(handle: ForSelectOptionHandle<T>): void;

  /** All registered options in DOM order. */
  readonly options: Signal<readonly ForSelectOptionHandle<T>[]>;
  /** Resolved labels of the options whose value is in `value()`, in selection order. */
  readonly selectedLabels: Signal<readonly string[]>;
  /**
   * Host element of the first enabled, currently-selected option, or `null`
   * when no selection exists. Used by `position="item-aligned"` to anchor
   * the listbox over the trigger; falls back to the first enabled option
   * inside the listbox when this is `null`.
   */
  readonly selectedOptionEl: Signal<HTMLElement | null>;

  isSelected(value: T): boolean;
  /** Toggle in multi-mode, replace + close in single-mode. No-op on disabled / readonly. */
  activate(value: T): void;
  /** Move focus inside the open listbox in response to an arrow / Home / End key. */
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  /** Open-state typeahead: focus the first enabled option whose text matches the buffered prefix. */
  handleTypeahead(event: KeyboardEvent): void;
  /**
   * Closed-state typeahead (single mode only). Selects the first matching
   * option directly without opening the listbox — mirrors native `<select>`
   * behavior. Returns `true` if the key was consumed by typeahead.
   */
  handleClosedTypeahead(event: KeyboardEvent): boolean;

  focusFirstEnabledOption(): boolean;
  focusLastEnabledOption(): boolean;
  /** Focus the first enabled option whose value is currently selected. Returns `false` if none. */
  focusSelectedOption(): boolean;

  toggle(initialFocus?: ForSelectInitialFocus): void;
  openMenu(initialFocus?: ForSelectInitialFocus): void;
  closeMenu(reason: ForSelectCloseReason): void;

  /**
   * Reason of the most recent close, or `null` while the listbox is open
   * (or before any close). Read by `[forSelectContent]` so `'tab'` closes
   * skip the return-focus step — Tab needs the browser to advance focus
   * from the trigger, and a re-focus would steal it back.
   */
  readonly lastCloseReason: Signal<ForSelectCloseReason | null>;

  /**
   * Commit the focused option's value (single mode) and close the listbox
   * with reason `'tab'`. Moves focus to the trigger synchronously so the
   * browser's Tab default action advances focus from there to the next
   * (or previous) focusable in tab order. Multi-mode skips the value-set
   * — selection toggles already happened via Space / Enter / click.
   */
  commitOnTab(value: T): void;

  // --- Shared dismiss pipeline. Escape is consumer-owned on the anchored path
  //     (`emitEscapeKeyDown` emits `(escapeKeyDown)`, stops propagation, marks
  //     touched, and closes with reason `'escape'`); on the modal path the
  //     modal-shell builds the veto and owns the close, so it forwards the
  //     emit-only `forwardEscapeKeyDown`. The outside channels are owned by the
  //     shell in both paths, which builds + reuses one veto across the specific
  //     and composite channels and hands it to these forwarders. Both paths
  //     route the implicit close through the content's `requestClose`. ---
  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void;
  /** Modal-path Escape forwarder: emit only; the modal shell builds the veto and owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;

  /**
   * Full source length when virtualizing, `undefined` in the default
   * DOM-focus path. Drives each option's `aria-setsize` / `aria-posinset`
   * and the focus-model branch.
   */
  readonly totalCount: Signal<number | undefined>;
  /**
   * The active option's `id` in the virtualized activedescendant model,
   * `null` in the default path. The content surface reflects it as
   * `aria-activedescendant`; options read it for `data-highlighted`.
   */
  readonly activeDescendantId: Signal<string | null>;
  /**
   * Virtualized-path open hook. Called by `[forSelectContent]` after it
   * focuses its own surface on open: seeds `aria-activedescendant` to the
   * committed option (scrolling it into view via `(scrollToIndex)`), or the
   * first enabled option when nothing is selected.
   */
  seedVirtualizedInitialFocus(): void;
  /**
   * Virtualized-path keyboard handler. Called by `[forSelectContent]`'s host
   * keydown only when `totalCount()` is set: Arrow/Home/End navigation,
   * Enter/Space activation of the active descendant, single-mode Tab commit,
   * and typeahead — all in the activedescendant model.
   */
  handleVirtualizedKeydown(event: KeyboardEvent): void;
  /**
   * Called by an option on click in the virtualized path: moves
   * `aria-activedescendant` to that option and returns DOM focus to the
   * content surface. No-op in the default path.
   */
  notifyOptionClick(optionId: string): void;

  /** Flip the `touched` model. Called by trigger on blur-to-outside and on dismiss events. */
  markTouched(): void;
}

export const FOR_SELECT_CONTEXT = new InjectionToken<ForSelectContext>('FOR_SELECT_CONTEXT');

export function injectSelectContext<T = unknown>(piece: string): ForSelectContext<T> {
  const ctx = inject(FOR_SELECT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/select] ${piece} must be used inside a [forSelect] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forSelect] root.',
    );
  }
  return ctx as unknown as ForSelectContext<T>;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forSelectTrigger]` input carries one, the injected `FOR_SELECT_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 */
export function injectSelectTriggerContext<T = unknown>(
  explicitRoot: Signal<ForSelectContext<T> | ''>,
): Signal<ForSelectContext<T>> {
  const injected = inject(FOR_SELECT_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected as unknown as ForSelectContext<T>;
    }
    throw new Error(
      '[forty-cdk/select] ForSelectTrigger could not resolve its [forSelect] root: ' +
        'no FOR_SELECT_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forSelectTrigger]="root" with #root="forSelect".',
    );
  });
}
