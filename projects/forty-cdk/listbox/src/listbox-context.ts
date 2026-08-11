import { inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type ListNavigationAction,
  orphanContextError,
  type WritingDirection,
} from 'forty-cdk/core';

export interface ForListboxOptionHandle<T = unknown> {
  readonly host: HTMLElement;
  readonly value: Signal<T>;
  readonly disabled: Signal<boolean>;
  readonly id: Signal<string>;
  readonly posInSet: Signal<number | null>;
}

/**
 * Coordination contract owned by `ForListbox`. Each `ForListboxOption`
 * registers a handle on init so the group can react to disabled changes,
 * compute the first-enabled tab entry, and run typeahead matching.
 *
 * Generic over the option value type `T` (default `string` at the public
 * root). When a consumer binds object items the directive infers `T` from
 * `[(value)]` and `[forListboxOption][value]`; object identity is resolved
 * by the consumer-supplied `compareWith` and the form's hidden inputs
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
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Serialize an item for the hidden input's `value` attribute. Defaults to `String(item)`. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  /**
   * Full source length when virtualizing, `undefined` in the roving-tabindex
   * path. Drives the option's `aria-setsize` / `aria-posinset` and the
   * option's focus-model branch.
   */
  readonly totalCount: Signal<number | undefined>;
  /**
   * The active option's `id` when using the activedescendant focus model,
   * `null` in the roving-tabindex path. Moved by keyboard navigation and by
   * hover alike. Options read this to compute `data-highlighted`.
   */
  readonly activeDescendantId: Signal<string | null>;

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
  /**
   * `true` when `el` is the highlighted option in the roving-tabindex path
   * (reflected as `data-highlighted`): the one the pointer is over, else the
   * roving active option.
   */
  isOptionHighlighted(el: HTMLElement): boolean;
  /**
   * Roving-tabindex value for `el`: `0` for the active option once roving has
   * taken over, `-1` otherwise. Returns `null` before any option is active so
   * the caller can fall back to {@link isFirstFocusableOption}.
   */
  optionTabindex(el: HTMLElement): -1 | 0 | null;
  /**
   * Mark `el` as the roving-tabindex active option (called on option focus).
   * Also drops any pointer highlight, so the keyboard channel owns the highlight
   * again from the move that focused `el`.
   */
  setActiveOption(el: HTMLElement): void;

  /**
   * All registered options, in DOM (rendered) order. Exposed for container-level
   * coordinators that compose onto the listbox — e.g. `ForListboxReorder` reads the
   * ordered hosts to resolve drop targets and emit reorder indices — without each
   * option needing a `[forDraggable]` that would fight the listbox's own roving tabindex.
   */
  readonly options: Signal<readonly ForListboxOptionHandle<T>[]>;

  /**
   * Called by an option on click. In the virtualized path, moves
   * `aria-activedescendant` to that option and returns DOM focus to the
   * container. A no-op in the roving-tabindex path.
   */
  notifyOptionClick(optionId: string): void;

  registerOption(handle: ForListboxOptionHandle<T>): void;
  unregisterOption(handle: ForListboxOptionHandle<T>): void;
}

/**
 * The listbox's pointer channel: the one call `[forListboxOption]` makes so the
 * option under the cursor takes the highlight.
 *
 * Deliberately **not** part of {@link ForListboxContext} and never exported from
 * `public-api.ts` — a consumer styles the pointed-at option off
 * `data-highlighted`, never by reporting a hover into the root.
 */
export interface ListboxPieceContext {
  /**
   * Reported by `[forListboxOption]` on `pointermove` so the highlight follows
   * the pointer. Never moves DOM focus, never commits a selection (not even
   * under `selectionFollowsFocus`), and never touches the range anchor; a move
   * arriving inside the pointer-suppression window a programmatic scroll opened
   * is ignored, so a synthetic `pointermove` from the scroll cannot hijack the
   * keyboard's highlight.
   *
   * @param host The hovered option's host element — the roving path's highlight target.
   * @param id The hovered option's id — the activedescendant path's highlight target.
   */
  highlightFromPointer(host: HTMLElement, id: string): void;
}

/**
 * The listbox's internal coordination surface: everything
 * {@link ForListboxContext} publishes plus the {@link ListboxPieceContext} call.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_LISTBOX_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while `[forListboxOption]` gets the pointer channel. `ForListbox`
 * declares `highlightFromPointer` TS-`private`, which keeps it out of the
 * emitted `.d.ts` while `useExisting` still satisfies this contract at runtime.
 */
export interface ListboxContext<T = unknown> extends ForListboxContext<T>, ListboxPieceContext {}

/**
 * DI token for the listbox's coordination surface, provided by `[forListbox]`.
 *
 * Publicly typed as the read surface {@link ForListboxContext}, which is the whole
 * of what the token promises a consumer. The options read the same token at an
 * internal type that adds the pointer-highlight channel, so a wrapper re-providing
 * it must alias it to the root: `{ provide: FOR_LISTBOX_CONTEXT, useExisting: MyListbox }`,
 * where `MyListbox` extends `ForListbox`. A value that merely satisfies the declared
 * type resolves too, and is rejected in dev mode by the first piece to reach the channel.
 */
export const FOR_LISTBOX_CONTEXT = new InjectionToken<ForListboxContext>('FOR_LISTBOX_CONTEXT');

export function injectListboxContext<T = unknown>(piece: string): ListboxContext<T> {
  const ctx = inject(FOR_LISTBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-LISTBOX-001',
      piece,
      root: '[forListbox]',
      token: 'FOR_LISTBOX_CONTEXT',
    });
  }
  const widened = ctx as unknown as ListboxContext<T>;
  assertRootContext({
    entryPoint: 'listbox',
    token: 'FOR_LISTBOX_CONTEXT',
    root: '[forListbox]',
    piece,
    probe: () => widened.highlightFromPointer,
  });
  return widened;
}
