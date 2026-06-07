import { inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import type { WritingDirection } from '../_internal/keyboard-navigation/keyboard-navigation';
import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';

/**
 * Why the combobox closed. Mirrors the menu / select vocabulary so consumers
 * can switch on the reason regardless of overlay flavor.
 */
export type ForComboboxCloseReason =
  | 'escape'
  | 'pointerDownOutside'
  | 'focusOutside'
  | 'select'
  | 'tab'
  | 'programmatic';

/**
 * Autocomplete mode applied to the input. Mirrors the
 * [WAI-ARIA combobox autocomplete property](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#wai-ariaroles,states,andproperties).
 *
 * - `'none'`: input acts as a free-text query; no completion is performed.
 * - `'list'`: the listbox shows filtered options; the input value reflects
 *   the user's typed query verbatim.
 * - `'inline'`: the rest of the first matching option is auto-completed
 *   into the input as selected text; the listbox does not auto-open.
 * - `'both'`: combines `'list'` and `'inline'` — listbox opens with the
 *   filtered options *and* the first match auto-completes inline.
 */
export type ForComboboxAutocomplete = 'none' | 'list' | 'inline' | 'both';

export interface ForComboboxOptionHandle<T = unknown> extends CollectionHandle {
  readonly id: Signal<string>;
  readonly value: Signal<T>;
  readonly label: Signal<string>;
  readonly disabled: Signal<boolean>;
  /**
   * Index in the consumer's source array. Required when virtualizing so the
   * directive can fold off-screen options into the snapshot keyed by
   * absolute position. Optional otherwise — when absent the snapshot falls
   * back to DOM order.
   */
  readonly posInSet?: Signal<number | null>;
}

export interface ForComboboxChipHandle<T = unknown> extends CollectionHandle {
  readonly value: Signal<T>;
}

/**
 * Coordination contract owned by `[forCombobox]`. Input, content, options,
 * groups, separators, the empty-state directive, the clear button, and the
 * multi-mode chip pieces all inject this token to read state and delegate
 * behavior.
 *
 * The value model is always an array — single mode (`multiple=false`,
 * default) keeps 0 or 1 element, multi mode keeps any number. This mirrors
 * `[forListbox]` / `[forSelect]` so consumers learn one selection contract
 * across the whole library.
 *
 * Generic over the option value type `T` (default `string`). When a
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * the per-piece signatures specialize accordingly. Items are compared via
 * the consumer-provided `isItemEqualToValue` and rendered as labels via
 * `itemToStringLabel`; the form's hidden inputs serialize via
 * `itemToFormValue`.
 */
export interface ForComboboxContext<T = unknown> {
  readonly query: ModelSignal<string>;
  readonly value: ModelSignal<readonly T[]>;
  readonly open: ModelSignal<boolean>;

  readonly multiple: Signal<boolean>;
  /**
   * The combobox's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Input, options, clear, and chip pieces
   * read this so a disabled combobox (or fieldset) is inert and exposes
   * `aria-disabled`.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly dir: Signal<WritingDirection>;

  readonly autocompleteMode: Signal<ForComboboxAutocomplete>;
  readonly openOnFocus: Signal<boolean>;
  readonly openOnQuery: Signal<boolean>;
  readonly commitOnSelect: Signal<boolean>;
  readonly clearOnQueryChange: Signal<boolean>;

  readonly dismissible: Signal<boolean>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly loop: Signal<boolean>;

  readonly inputId: Signal<string>;
  readonly contentId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

  readonly anchor: Signal<ReferenceElement | null>;
  readonly input: Signal<HTMLInputElement | null>;
  registerInput(el: HTMLInputElement): void;
  unregisterInput(el: HTMLInputElement): void;

  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  registerOption(handle: ForComboboxOptionHandle<T>): void;
  unregisterOption(handle: ForComboboxOptionHandle<T>): void;
  readonly options: Signal<readonly ForComboboxOptionHandle<T>[]>;

  /** Multi-mode chip collection. Order follows DOM (= `value()` order in practice). */
  registerChip(handle: ForComboboxChipHandle<T>): void;
  unregisterChip(handle: ForComboboxChipHandle<T>): void;
  readonly chips: Signal<readonly ForComboboxChipHandle<T>[]>;

  /**
   * Selected entries paired with their resolved label (from the option
   * cache) — convenient for rendering chips with `@for`. Falls back to
   * `itemToStringLabel(value)` when no matching option is registered (and
   * to the raw string when `T` is `string`).
   */
  readonly selected: Signal<readonly { value: T; label: string }[]>;

  /** Compare two items for equality. Defaults to `===`; overridden for object values. */
  readonly isItemEqualToValue: Signal<(a: T, b: T) => boolean>;
  /** Render an item as a string label. Drives chip labels and `commitOnSelect` writes into the input. */
  readonly itemToStringLabel: Signal<(item: T) => string>;
  /** Serialize an item for the hidden input's `value` attribute. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  /** Id of the currently active option (drives `aria-activedescendant` on the input). */
  readonly activeId: Signal<string | null>;
  /** Set the activedescendant directly. Used by options on pointer-move and by the input on inline-completion seed. */
  setActiveId(id: string | null): void;
  /** Read-only access to the cached snapshot consumed by inline-autocomplete in the input directive. */
  cachedOptions(): readonly { id: string; value: T; label: string }[];

  /**
   * Total number of options in the consumer's source array. Used for
   * `aria-setsize` and for navigation past the visible window when
   * virtualizing. Falls back to `options().length` when undefined.
   */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive [start, end) range of options currently rendered when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;

  /** True when `value` includes `v` per the active equality function. */
  isSelected(value: T): boolean;
  /** True when `id` is the activedescendant. */
  isActive(id: string): boolean;

  /**
   * Activate by handle. Single mode replaces + closes + commits label. Multi
   * mode toggles in/out + stays open + (when `commitOnSelect`) clears the
   * query so the user can search the next item. No-op on disabled / readonly.
   */
  activate(handle: ForComboboxOptionHandle<T>): void;

  /** Remove a value from `value()`. Used by chip-remove and Backspace heuristics. */
  removeValue(value: T): void;

  /** Move the activedescendant to the first / last / next / prev enabled option. */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void;
  /** Activate the option currently marked as activedescendant (Enter from the input). */
  activateActive(): boolean;

  /** Set the typed query. Emits inline completion / openOnQuery side-effects via the input directive. */
  setQueryFromInput(query: string): void;

  /**
   * Clear value and (optionally) query. Used by `[forComboboxClear]` and
   * by the Backspace-on-empty-input heuristic. The query is reset only
   * when `clearQuery` is true.
   */
  clear(clearQuery?: boolean): void;

  /** Where focus should land after the listbox opens. The input directive sets this before flipping `open`. */
  readonly initialFocus: Signal<'first' | 'last'>;
  setInitialFocus(target: 'first' | 'last'): void;

  toggle(): void;
  openMenu(initialFocus?: 'first' | 'last'): void;
  closeMenu(reason: ForComboboxCloseReason): void;

  /**
   * Escape is consumer-owned and routed through the input directive (focus
   * stays in the input), so it is invoked directly with the raw
   * `KeyboardEvent` rather than through the dismissable layer.
   */
  emitEscapeKeyDown(event: KeyboardEvent): void;
  /**
   * Outside-interaction emit forwarders. `injectOverlayShell` builds and
   * reuses one `VetoableNativeEvent` across the specific and composite
   * channels, then hands it to these forwarders to fire the matching output
   * and calls `requestClose` when un-vetoed.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void;
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void;
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void;
  /** Implicit close requested by the shell after an un-vetoed outside interaction. */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void;

  /** Flip the `touched` model. Called by input on blur-to-outside and by dismiss events. */
  markTouched(): void;
}

export const FOR_COMBOBOX_CONTEXT = new InjectionToken<ForComboboxContext>('FOR_COMBOBOX_CONTEXT');

export function injectComboboxContext<T = unknown>(piece: string): ForComboboxContext<T> {
  const ctx = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/combobox] ${piece} must be used inside a [forCombobox] element.`);
  }
  return ctx as unknown as ForComboboxContext<T>;
}
