import { inject, InjectionToken, ModelSignal, Signal } from '@angular/core';
import type { Placement, ReferenceElement } from '@floating-ui/dom';

import type { CollectionHandle } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';

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

export interface ForComboboxOptionHandle extends CollectionHandle {
  readonly id: Signal<string>;
  readonly value: Signal<string>;
  readonly label: Signal<string>;
  readonly disabled: Signal<boolean>;
}

export interface ForComboboxChipHandle extends CollectionHandle {
  readonly value: Signal<string>;
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
 */
export interface ForComboboxContext {
  readonly query: ModelSignal<string>;
  readonly value: ModelSignal<readonly string[]>;
  readonly open: ModelSignal<boolean>;

  readonly multiple: Signal<boolean>;
  readonly disabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;

  readonly autocomplete: Signal<ForComboboxAutocomplete>;
  readonly openOnFocus: Signal<boolean>;
  readonly openOnQuery: Signal<boolean>;
  readonly commitOnSelect: Signal<boolean>;
  readonly clearOnQueryChange: Signal<boolean>;

  readonly dismissible: Signal<boolean>;
  readonly placement: Signal<Placement>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign | undefined>;
  readonly offset: Signal<number>;
  readonly sideOffset: Signal<number | undefined>;
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

  registerOption(handle: ForComboboxOptionHandle): void;
  unregisterOption(handle: ForComboboxOptionHandle): void;
  readonly options: Signal<readonly ForComboboxOptionHandle[]>;

  /** Multi-mode chip collection. Order follows DOM (= `value()` order in practice). */
  registerChip(handle: ForComboboxChipHandle): void;
  unregisterChip(handle: ForComboboxChipHandle): void;
  readonly chips: Signal<readonly ForComboboxChipHandle[]>;

  /**
   * Selected entries paired with their resolved label (from the option
   * cache) — convenient for rendering chips with `@for`. Falls back to the
   * raw value string when no matching option is registered.
   */
  readonly selected: Signal<readonly { value: string; label: string }[]>;

  /** Id of the currently active option (drives `aria-activedescendant` on the input). */
  readonly activeId: Signal<string | null>;
  /** Set the activedescendant directly. Used by options on pointer-move and by the input on inline-completion seed. */
  setActiveId(id: string | null): void;
  /** Read-only access to the cached snapshot consumed by inline-autocomplete in the input directive. */
  cachedOptions(): readonly { id: string; value: string; label: string }[];

  /** True when `value` includes `v`. */
  isSelected(value: string): boolean;
  /** True when `id` is the activedescendant. */
  isActive(id: string): boolean;

  /**
   * Activate by handle. Single mode replaces + closes + commits label. Multi
   * mode toggles in/out + stays open + (when `commitOnSelect`) clears the
   * query so the user can search the next item. No-op on disabled / readonly.
   */
  activate(handle: ForComboboxOptionHandle): void;

  /** Remove a value from `value()`. Used by chip-remove and Backspace heuristics. */
  removeValue(value: string): void;

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

  emitEscapeKeyDown(event: KeyboardEvent): void;
  emitPointerDownOutside(event: PointerEvent): void;
  emitFocusOutside(event: FocusEvent): void;
  emitInteractOutside(event: PointerEvent | FocusEvent): void;

  /** Flip the `touched` model. Called by input on blur-to-outside and by dismiss events. */
  markTouched(): void;
}

export const FOR_COMBOBOX_CONTEXT = new InjectionToken<ForComboboxContext>(
  'FOR_COMBOBOX_CONTEXT',
);

export function injectComboboxContext(piece: string): ForComboboxContext {
  const ctx = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/combobox] ${piece} must be used inside a [forCombobox] element.`,
    );
  }
  return ctx;
}
