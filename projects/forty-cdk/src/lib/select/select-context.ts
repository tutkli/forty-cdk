import {
  inject,
  InjectionToken,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';

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
  readonly disabled: Signal<boolean>;
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

  readonly disabled: Signal<boolean>;
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
   * `hideWhenDetached`/`avoidCollisions` inputs are no-ops in
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

  /** The button trigger — passed to floating-ui as anchor and exempt from outside-pointer checks. */
  readonly anchor: Signal<ReferenceElement | null>;
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  /** The mounted `[forSelectContent]` element. */
  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  registerOption(handle: ForSelectOptionHandle<T>): void;
  unregisterOption(handle: ForSelectOptionHandle<T>): void;

  /** All registered options in DOM order. */
  readonly options: Signal<readonly ForSelectOptionHandle<T>[]>;
  /** Trimmed `textContent` of the options whose value is in `value()`, in selection order. */
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

  // --- Shared dismiss pipeline. Escape is consumer-owned (emits
  //     `(escapeKeyDown)`, stops propagation, marks touched, and closes with
  //     reason `'escape'`); the outside channels are owned by the shell, which
  //     builds + reuses one veto across the specific and composite channels,
  //     hands it to these forwarders to fire the matching output, and calls
  //     the content's `requestClose` when un-vetoed. Used by both the anchored
  //     (`injectOverlayShell`) and modal (`injectModalShell`) paths. ---
  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void;

  // --- Modal (modal-shell) dismiss pipeline: the shell builds the veto and
  //     requests the close itself, forwarding `.emit` through these output
  //     refs. The escape ref is also used by the modal path. ---
  readonly escapeKeyDown: OutputEmitterRef<VetoableNativeEvent<KeyboardEvent>>;
  readonly pointerDownOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent>>;
  readonly focusOutside: OutputEmitterRef<VetoableNativeEvent<FocusEvent>>;
  readonly interactOutside: OutputEmitterRef<VetoableNativeEvent<PointerEvent | FocusEvent>>;

  /**
   * Hooks into the auto-focus pipeline. Content fires these just before
   * its imperative `.focus()` (open) or the trigger return-focus (close);
   * `event.preventDefault()` skips the move. Returns `true` when the
   * consumer vetoed.
   */
  emitAutoFocusOnOpen(): boolean;
  emitAutoFocusOnClose(): boolean;

  /** Flip the `touched` model. Called by trigger on blur-to-outside and on dismiss events. */
  markTouched(): void;
}

export const FOR_SELECT_CONTEXT = new InjectionToken<ForSelectContext>('FOR_SELECT_CONTEXT');

export function injectSelectContext<T = unknown>(piece: string): ForSelectContext<T> {
  const ctx = inject(FOR_SELECT_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/select] ${piece} must be used inside a [forSelect] element.`);
  }
  return ctx as unknown as ForSelectContext<T>;
}
