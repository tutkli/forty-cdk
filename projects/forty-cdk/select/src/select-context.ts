import { computed, inject, InjectionToken, type Signal } from '@angular/core';

import {
  assertRootContext,
  type CollectionHandle,
  orphanContextError,
  unresolvedRootError,
  type WritingDirection,
} from 'forty-cdk/core';
import {
  type FloatingAlign,
  type FloatingSide,
  type ListboxOverlayContext,
} from 'forty-cdk/core-overlay';

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
 * the root can match it against `value()` via `compareWith`.
 */
export interface ForSelectOptionHandle<T = unknown> extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the root focuses the
   * option and scrolls it into view.
   */
  readonly host: HTMLElement;
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
 * The consumer-facing slice of the select's overlay surface, reached through
 * {@link ForSelectContext.overlay}: the trigger / content ids the ARIA wiring
 * points at, the reason of the last close, and the open / close commands that
 * mutate `open()` through the root's guards.
 *
 * It is narrow. The full state machine behind it — the trigger /
 * anchor / content / option registries, the DOM-focus navigation algorithm, the
 * initial-focus state, and the dismiss / auto-focus emit forwarders — is the
 * library's own wiring and is refactored without notice, so it stays on an
 * unexported surface the pieces reach through their own token.
 */
export interface ForSelectOverlayFacade {
  /** The trigger's stable id, adopted from a consumer-set static id when present. */
  readonly triggerId: Signal<string>;
  /** The content surface's stable id, adopted from a consumer-set static id when present. */
  readonly contentId: Signal<string>;
  /** Reason of the most recent close, or `null` while open (or before any close). */
  readonly lastCloseReason: Signal<ForSelectCloseReason | null>;
  /**
   * Registers the element `[forSelectContent]` is positioned against, instead of
   * the trigger. The declarative `[forSelectAnchor]` covers the common case; call
   * this directly when the anchor element is only reachable imperatively — it
   * lives in an ancestor component's template, so a directive placed on it would
   * resolve DI outside this root. At most one anchor may be registered per
   * `[forSelect]`; a second one throws.
   */
  registerAnchor(el: HTMLElement): void;
  /** Unregisters the positioning anchor, falling back to the trigger. Reference-based. */
  unregisterAnchor(el: HTMLElement): void;
  /** Opens the listbox with the requested initial-focus target. */
  openOverlay(initialFocus: ForSelectInitialFocus): void;
  /** Closes the listbox, recording `reason` as the last close reason. */
  closeOverlay(reason: ForSelectCloseReason): void;
  /** Opens the listbox when closed (with `initialFocus`), closes it when open. */
  toggle(initialFocus: ForSelectInitialFocus): void;
}

/**
 * The shared overlay-listbox coordination surface backing
 * {@link ForSelectOverlayFacade}: trigger / anchor / content registries + ids,
 * DOM-focus navigation, the open / close machine, the initial-focus /
 * close-reason state, and the dismiss / auto-focus emit forwarders. Backed by
 * the shared `ListboxOverlayController`, so child directives read it here
 * instead of the root re-forwarding each member.
 *
 * Internal — never re-exported from `public-api.ts`; pieces reach it through
 * {@link SelectContext}.
 */
export type ForSelectOverlayContext<T = unknown> = ListboxOverlayContext<
  ForSelectOptionHandle<T>,
  ForSelectInitialFocus,
  ForSelectCloseReason
>;

/**
 * Coordination contract owned by `[forSelect]` — the surface a consumer reads
 * and drives. Advanced consumers inject the token to read the selection and the
 * open state and to move them through the root's guards (`activate` /
 * `selectAll`, plus the open / close commands on {@link ForSelectContext.overlay}).
 * The wiring the library's own pieces read off the root is not
 * part of it.
 *
 * Generic over the option value type `T` (default `string` at the public
 * root). When a consumer binds object items the directive infers `T` from
 * `[(value)]` and the per-piece signatures specialize accordingly. Items are
 * compared via the consumer-provided `compareWith` and serialized for
 * the form's hidden inputs via `itemToFormValue`; option text labels are
 * still read from the rendered `textContent`.
 */
export interface ForSelectContext<T = unknown> {
  /**
   * The current selection, as a read-only signal. Mutate it through the guarded
   * methods (`activate` / `commitOnTab`) or the root's `[(value)]` binding — a
   * direct write would bypass the root's disabled / readonly guards and
   * `markTouched`.
   */
  readonly value: Signal<readonly T[]>;
  /**
   * Whether the listbox is open, as a read-only signal. Mutate it through
   * `overlay.toggle` / `overlay.openOverlay` / `overlay.closeOverlay` or the root's
   * `[(open)]` binding.
   */
  readonly open: Signal<boolean>;
  readonly multiple: Signal<boolean>;

  /**
   * The select's effective disabled — its own `disabled` input OR'd with a
   * surrounding disabled `[forFieldset]`. Trigger and options read this so a
   * disabled select (or fieldset) is inert: the trigger reflects the native
   * `disabled` attribute (its single channel) and the options, which
   * must stay focusable, reflect `aria-disabled`.
   */
  readonly effectiveDisabled: Signal<boolean>;
  readonly readonly: Signal<boolean>;
  readonly required: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly pending: Signal<boolean>;

  readonly dir: Signal<WritingDirection>;
  readonly placeholder: Signal<string>;

  /**
   * The consumer-facing slice of the overlay surface: the trigger / content ids,
   * the last close reason, and the open / close commands. The registration and
   * navigation machinery behind it is internal — see
   * {@link ForSelectOverlayFacade}.
   */
  readonly overlay: ForSelectOverlayFacade;

  /** Resolved labels of the options whose value is in `value()`, in selection order. */
  readonly selectedLabels: Signal<readonly string[]>;

  isSelected(value: T): boolean;
  /** Toggle in multi-mode, replace + close in single-mode. No-op on disabled / readonly. */
  activate(value: T): void;

  /**
   * Multi-select only (APG range keyboard, Ctrl/Cmd+A). Select every enabled
   * option, or clear the selection when they are all already selected (toggle).
   * No-op in single mode, disabled, readonly, or the virtualized path.
   */
  selectAll(): void;

  /** Flip the `touched` model. Called by trigger on blur-to-outside and on dismiss events. */
  markTouched(): void;
}

/**
 * The select's piece-coordination surface: everything the library's own pieces
 * read off the root that a consumer has no call to touch — the positioning
 * mirrors `[forSelectContent]` feeds to floating-ui, the APG range-selection and
 * typeahead handlers `[forSelectOption]` routes its keys through, and the
 * virtualized activedescendant model.
 *
 * **Not** part of {@link ForSelectContext} and never exported from
 * `public-api.ts`: these are the members a refactor of the anatomy moves, so
 * freezing them at 1.0 would freeze the anatomy with them.
 */
export interface SelectPieceContext<T = unknown> {
  /**
   * When `true`, the listbox is a trapped / inert / scroll-locked modal
   * surface (routed through the core modal shell) instead of the anchored
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
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;
  readonly orientation: Signal<'horizontal' | 'vertical'>;
  readonly selectionFollowsFocus: Signal<boolean>;

  readonly ariaLabel: Signal<string | null>;

  /**
   * The `[forSelect]` root (wrapper) element. Lets the trigger tell a focus
   * move to a sibling *inside* the wrapper (e.g. a clear button next to the
   * trigger) apart from a genuine focus leave, so `touched` isn't flipped
   * prematurely when focus stays within the control.
   */
  readonly host: HTMLElement;

  /** Compare two items for equality. Defaults to `===`; overridden for object values. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Serialize an item for the hidden input's `value` attribute. Defaults to `String(item)`. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  /**
   * Host element of the first enabled, currently-selected option, or `null`
   * when no selection exists. Used by `position="item-aligned"` to anchor
   * the listbox over the trigger; falls back to the first enabled option
   * inside the listbox when this is `null`.
   */
  readonly selectedOptionEl: Signal<HTMLElement | null>;

  /**
   * Multi-select only (APG range keyboard). Move focus to the next / previous
   * enabled option and toggle it in/out of the selection, without moving the
   * range anchor. Non-wrapping. No-op in single mode, when disabled, or in the
   * virtualized path. Focus still moves under `readonly`; only the selection
   * mutation is blocked.
   */
  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void;
  /**
   * Multi-select only (APG range keyboard, Shift+Space). Add every enabled
   * option between the range anchor and the focused option to the selection,
   * preserving any selection outside the span. Falls back to selecting just the
   * focused option when no anchor exists. No-op in single mode, disabled,
   * readonly, or the virtualized path.
   */
  selectRangeToFocused(currentOption: HTMLElement): void;
  /**
   * Multi-select only (APG range keyboard, Ctrl+Shift+Home / End). Add every
   * enabled option from the focused option to the first / last option to the
   * selection and move focus to that edge, preserving any selection outside the
   * span. No-op in single mode, disabled, or the virtualized path. Focus still
   * moves under `readonly`; only the selection mutation is blocked.
   */
  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void;
  /** Open-state typeahead: focus the first enabled option whose text matches the buffered prefix. */
  handleTypeahead(event: KeyboardEvent): void;
  /**
   * Closed-state typeahead (single mode only). Selects the first matching
   * option directly without opening the listbox — mirrors native `<select>`
   * behavior. Returns `true` if the key was consumed by typeahead.
   */
  handleClosedTypeahead(event: KeyboardEvent): boolean;

  /** Focus the first enabled option whose value is currently selected. Returns `false` if none. */
  focusSelectedOption(): boolean;
  /**
   * Scroll the selected option into view. Driven from `[forSelectContent]`'s
   * positioner first-resolved-position hook (`onFirstPosition`) in `'popper'`
   * mode — the only moment both prerequisites hold: the surface has been
   * portaled to `document.body` (resetting its `scrollTop` to 0) and
   * `@floating-ui/dom`'s `size` middleware has constrained it to its
   * `max-height` (so it is actually scrollable). Focusing the selected option
   * earlier scrolls before the surface is bounded, so the reveal is lost.
   * No-op while virtualizing (the navigator owns the virtualized scroll) and
   * when nothing is selected (initial focus lands on the first option, already
   * in view at the top).
   */
  scrollSelectedOptionIntoView(): void;

  /**
   * Commit the focused option's value (single mode) and close the listbox
   * with reason `'tab'`. Moves focus to the trigger synchronously so the
   * browser's Tab default action advances focus from there to the next
   * (or previous) focusable in tab order. Multi-mode skips the value-set
   * — selection toggles already happened via Space / Enter / click.
   */
  commitOnTab(value: T): void;

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
   * committed option (scrolling it into view via `(scrollToIndex)`) when its
   * position is known — in the rendered window, previously rendered, or
   * supplied via the root's `[selectedIndex]`; otherwise focuses the first
   * enabled option.
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

  /**
   * Host element of the option the pointer is over in the default DOM-focus
   * path, `null` when the pointer is over none. Self-heals on read: a host that
   * has left the registered set or become disabled is discounted, so the focused
   * option reclaims the highlight. Always `null` in the virtualized path, where
   * hover moves {@link SelectPieceContext.activeDescendantId} itself.
   */
  readonly pointerHighlightedOption: Signal<HTMLElement | null>;
  /**
   * Reported by `[forSelectOption]` on `pointermove` so the highlight follows
   * the pointer. Never moves DOM focus, so it never commits a selection — not
   * even under `selectionFollowsFocus`, whose commit hangs off the navigation
   * focus move — and never touches the range anchor. A move arriving inside the
   * pointer-suppression window a programmatic scroll opened is ignored, or a
   * scroll sliding a different option under a stationary cursor would hand the
   * highlight to whatever the user merely scrolled past.
   *
   * @param host The hovered option's host — the DOM-focus path's highlight target.
   * @param id The hovered option's id — the virtualized path's highlight target.
   */
  highlightFromPointer(host: HTMLElement, id: string): void;
  /**
   * Called by an option when it takes DOM focus: drops any pointer highlight, so
   * the keyboard channel owns the highlight again from the move that focused the
   * option.
   */
  notifyOptionFocus(): void;
  /**
   * Called by `[forSelectContent]` when the pointer leaves the listbox surface:
   * drops any pointer highlight, so the focused option reclaims it instead of a
   * row staying decorated with the cursor elsewhere on the page. Crossing
   * between two adjacent options is not a leave, so the highlight never blinks
   * off. No-op in the virtualized path, where the pointer's claim *is*
   * {@link SelectPieceContext.activeDescendantId} and releasing it would leave
   * the container with no active option.
   */
  releasePointerHighlight(): void;
}

/**
 * DI token for the select's coordination surface, provided by `[forSelect]`.
 *
 * Publicly typed as the read surface {@link ForSelectContext}, which is the whole of what
 * the token promises a consumer — `overlay` included, narrowed there to
 * {@link ForSelectOverlayFacade}. The pieces read the same token at an internal type that
 * widens it to the full overlay controller, so a wrapper re-providing it must alias it to
 * the root: `{ provide: FOR_SELECT_CONTEXT, useExisting: MySelect }`, where `MySelect`
 * extends `ForSelect`. A value that merely satisfies the declared type resolves too, and is
 * rejected in dev mode by the first piece to reach the controller.
 */
export const FOR_SELECT_CONTEXT = new InjectionToken<ForSelectContext>('FOR_SELECT_CONTEXT');

/**
 * The select's internal coordination surface: everything {@link ForSelectContext}
 * publishes, plus the {@link SelectPieceContext} members and the full overlay
 * state machine instead of the consumer facade.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_SELECT_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while the pieces get the wiring protocol. `ForSelect` declares
 * `overlay` with the narrow public type and the piece members TS-`private`,
 * which keeps both out of the emitted `.d.ts` while `useExisting` still
 * satisfies this contract at runtime.
 */
export interface SelectContext<T = unknown> extends ForSelectContext<T>, SelectPieceContext<T> {
  readonly overlay: ForSelectOverlayContext<T>;
}

/**
 * The constant half of both resolvers' {@link assertRootContext} calls, so the
 * injected and the explicit path state the same requirement. `SelectContext`
 * adds no method of its own — it widens `overlay` from the consumer facade to
 * the full controller — so the probe each call site supplies is nested.
 */
const ROOT_ASSERTION = {
  entryPoint: 'select',
  token: 'FOR_SELECT_CONTEXT',
  root: '[forSelect]',
};

export function injectSelectContext<T = unknown>(piece: string): SelectContext<T> {
  const ctx = inject(FOR_SELECT_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-SELECT-001',
      piece,
      root: '[forSelect]',
      token: 'FOR_SELECT_CONTEXT',
    });
  }
  const widened = ctx as unknown as SelectContext<T>;
  assertRootContext({
    ...ROOT_ASSERTION,
    piece,
    probe: () => widened.overlay.setInitialFocus,
  });
  return widened;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forSelectTrigger]` input carries one, the injected `FOR_SELECT_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 *
 * The explicit reference is a public `ForSelectContext`, so it is widened back
 * to the internal surface: the runtime object is always the `[forSelect]` root,
 * which owns the full overlay controller — the public interface only narrows
 * `overlay` to the consumer facade. Both paths are guarded, on read rather than
 * at injection time, because the explicit one only resolves inside the
 * `computed`; the explicit widening predates the one-token collapse
 * and was never
 * checked either.
 */
export function injectSelectTriggerContext<T = unknown>(
  explicitRoot: Signal<ForSelectContext<T> | ''>,
): Signal<SelectContext<T>> {
  const injected = inject(FOR_SELECT_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    const resolved = explicit === '' ? injected : explicit;
    if (!resolved) {
      throw unresolvedRootError({
        code: 'FORCDK-SELECT-002',
        trigger: '[forSelectTrigger]',
        root: '[forSelect]',
        token: 'FOR_SELECT_CONTEXT',
        exportAs: 'forSelect',
      });
    }
    const widened = resolved as unknown as SelectContext<T>;
    assertRootContext({
      ...ROOT_ASSERTION,
      piece: 'ForSelectTrigger',
      probe: () => widened.overlay.setInitialFocus,
    });
    return widened;
  });
}
