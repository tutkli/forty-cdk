import { inject, InjectionToken, type Signal } from '@angular/core';

import type {
  ListNavigationAction,
  WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';

export interface ForListboxOptionHandle<T = unknown> {
  readonly host: HTMLElement;
  readonly value: Signal<T>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `ForListbox`. Each `ForListboxOption`
 * registers a handle on init so the group can react to disabled changes,
 * compute the first-enabled tab entry, and run typeahead matching.
 *
 * Generic over the option value type `T` (default `string` at the public
 * root). When a consumer binds object items the directive infers `T` from
 * `[(value)]` and `[forListboxOption][value]`; object identity is resolved
 * by the consumer-supplied `isItemEqualToValue` and the form's hidden inputs
 * serialize via `itemToFormValue`. Option text labels are still read from the
 * rendered `textContent`.
 */
export interface ForListboxContext<T = unknown> {
  readonly value: Signal<readonly T[]>;
  readonly multiple: Signal<boolean>;
  /**
   * The listbox's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Each `ForListboxOption` ORs this into
   * its own `effectiveDisabled`, so a disabled listbox (or fieldset) disables
   * every option.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly dir: Signal<WritingDirection>;
  readonly selectionFollowsFocus: Signal<boolean>;

  /** Compare two items for equality. Defaults to `===`; overridden for object values. */
  readonly isItemEqualToValue: Signal<(a: T, b: T) => boolean>;
  /** Serialize an item for the hidden input's `value` attribute. Defaults to `String(item)`. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  isSelected(value: T): boolean;
  /** Toggle in multi-mode, replace in single-mode. No-op on disabled / readonly. */
  activate(value: T): void;
  /** Move focus from `currentOption` according to `action`. May also select if `selectionFollowsFocus` is on. */
  navigate(currentOption: HTMLElement, action: ListNavigationAction): void;
  /**
   * Multi-mode only. Move focus to the next/prev enabled option AND toggle its
   * selected state — APG "Shift+ArrowDown / Shift+ArrowUp toggles selection
   * while moving focus". No-op in single mode, on disabled, or when no enabled
   * neighbor exists. On `readonly` the focus still moves (matching
   * {@link navigate}); only the selection mutation is blocked.
   */
  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void;
  /**
   * Multi-mode only. APG "Shift+Space": select every enabled option from the
   * anchor (set on the most recent unmodified activation) up to and including
   * `currentOption`. Existing selection outside the range is preserved. No-op
   * in single mode or when the listbox is disabled / readonly.
   */
  selectRangeToFocused(currentOption: HTMLElement): void;
  /**
   * Multi-mode only. APG "Ctrl/Cmd+A": select every enabled option. If every
   * enabled option is already selected, clears the selection (toggle).
   */
  selectAll(): void;
  /**
   * Multi-mode only. APG "Ctrl+Shift+Home / Ctrl+Shift+End": select every
   * enabled option from `currentOption` (inclusive) to the first / last
   * enabled option, and move focus to that edge.
   */
  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void;
  /**
   * Forward a keydown to the typeahead helper. If the key is a printable
   * character, finds the first matching option and focuses it; returns true
   * to indicate the event was consumed.
   */
  handleTypeahead(event: KeyboardEvent): boolean;
  /**
   * Pre-focus tab-stop policy: with at least one selection, the first selected
   * enabled option is the sole entry point; otherwise the first enabled option
   * in DOM order. Guarantees a single `tabindex="0"` before roving takes over.
   */
  isFirstFocusableOption(el: HTMLElement): boolean;
  /** `true` when `el` is the roving-tabindex active option (reflected as `data-highlighted`). */
  isOptionHighlighted(el: HTMLElement): boolean;
  /**
   * Roving-tabindex value for `el`: `0` for the active option once roving has
   * taken over, `-1` otherwise. Returns `null` before any option is active so
   * the caller can fall back to {@link isFirstFocusableOption}.
   */
  optionTabindex(el: HTMLElement): -1 | 0 | null;
  /** Mark `el` as the roving-tabindex active option (called on option focus). */
  setActiveOption(el: HTMLElement): void;

  registerOption(handle: ForListboxOptionHandle<T>): void;
  unregisterOption(handle: ForListboxOptionHandle<T>): void;
}

export const FOR_LISTBOX_CONTEXT = new InjectionToken<ForListboxContext>('FOR_LISTBOX_CONTEXT');

export function injectListboxContext<T = unknown>(piece: string): ForListboxContext<T> {
  const ctx = inject(FOR_LISTBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(`[forty-cdk/listbox] ${piece} must be used inside a [forListbox] element.`);
  }
  return ctx as unknown as ForListboxContext<T>;
}
