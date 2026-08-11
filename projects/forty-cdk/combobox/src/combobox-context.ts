import { computed, inject, InjectionToken, type Signal } from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';

import {
  assertRootContext,
  type CollectionHandle,
  orphanContextError,
  unresolvedRootError,
  type VetoableNativeEvent,
  type WritingDirection,
} from 'forty-cdk/core';
import { type FloatingAlign, type FloatingSide } from 'forty-cdk/core-overlay';

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
 *   into the input as selected text; the listbox does not auto-open. Because
 *   the popup never opens, the default `@if (open())` anatomy renders no
 *   options and the label cache stays cold — inline completion only kicks in
 *   after the options have rendered once (the popup was opened some other way,
 *   e.g. ArrowDown / `openOnFocus`). Use `'both'` when a popup is acceptable.
 * - `'both'`: combines `'list'` and `'inline'` — listbox opens with the
 *   filtered options *and* the first match auto-completes inline.
 */
export type ForComboboxAutocomplete = 'none' | 'list' | 'inline' | 'both';

/**
 * Where the auto-highlight seed lands when the listbox opens. `'first'` / `'last'`
 * bias to the natural extreme (e.g. ArrowDown / ArrowUp on the trigger). `'selected'`
 * — used by the picker trigger's plain open — seeds the committed selection, falling
 * back to the first enabled option when there is no selection or it is filtered out.
 */
export type ForComboboxInitialFocus = 'first' | 'last' | 'selected';

export interface ForComboboxOptionHandle<T = unknown> extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the root scrolls the
   * highlighted option into view.
   */
  readonly host: HTMLElement;
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
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: chip navigation moves DOM
   * focus between hosts.
   */
  readonly host: HTMLElement;
  readonly value: Signal<T>;
}

/**
 * A registered `[forComboboxAction]` — a non-selecting action affordance
 * (`role="button"`) pinned inside the popup. Tracked in a collection separate
 * from options / chips so it never touches `value` / `options()` /
 * `aria-setsize`.
 */
export interface ForComboboxActionHandle extends CollectionHandle {
  /**
   * Narrowed from {@link CollectionHandle}'s `Node`: the action Tab ring moves
   * DOM focus onto the host.
   */
  readonly host: HTMLElement;
  readonly id: Signal<string>;
  readonly disabled: Signal<boolean>;
}

/**
 * Coordination contract owned by `[forCombobox]` — the surface a consumer
 * reads and drives. Advanced consumers inject the token to read the selection,
 * the query and the open state, and to move them through the root's guards
 * (`activate` / `removeValue` / `clear` / `openOverlay` / `closeOverlay`). The
 * wiring the library's own pieces read off the root is deliberately not part
 * of it.
 *
 * The value model is always an array — single mode (`multiple=false`,
 * default) keeps 0 or 1 element, multi mode keeps any number. This mirrors
 * `[forListbox]` / `[forSelect]` so consumers learn one selection contract
 * across the whole library.
 *
 * Generic over the option value type `T` (default `string`). When a
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * the per-piece signatures specialize accordingly. Items are compared via
 * the consumer-provided `compareWith` and rendered as labels via
 * `itemToStringLabel`; the form's hidden inputs serialize via
 * `itemToFormValue`.
 */
export interface ForComboboxContext<T = unknown> {
  /**
   * The typed query, as a read-only signal. Mutate it through `clear` or the
   * root's `[(query)]` binding — a direct write would skip the
   * inline-completion / open-on-query side-effects.
   */
  readonly query: Signal<string>;
  /**
   * The current selection, as a read-only signal. Mutate it through the guarded
   * methods (`activate` / `removeValue` / `clear`) or the root's `[(value)]`
   * binding — a direct write would bypass the disabled / readonly guards.
   */
  readonly value: Signal<readonly T[]>;
  /**
   * Whether the listbox is open, as a read-only signal. Mutate it through
   * `toggle` / `openOverlay` / `closeOverlay` or the root's `[(open)]` binding.
   */
  readonly open: Signal<boolean>;

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

  /**
   * Registers the element the listbox is positioned against, instead of the
   * input. The declarative `[forComboboxAnchor]` covers the common case; call
   * this directly when the anchor element is only reachable imperatively — it
   * lives in an ancestor component's template, so a directive placed on it would
   * resolve DI outside this root. At most one anchor may be registered per
   * `[forCombobox]`; a second one throws.
   */
  registerAnchor(el: HTMLElement): void;
  /**
   * Unregisters the positioning anchor, restoring the input fallback.
   * Reference-based, so an anchor torn down inside `@if` unwinds cleanly.
   */
  unregisterAnchor(el: HTMLElement): void;

  readonly options: Signal<readonly ForComboboxOptionHandle<T>[]>;

  /**
   * Selected entries paired with their resolved label (from the option
   * cache) — convenient for rendering chips with `@for`. Falls back to
   * `itemToStringLabel(value)` when no matching option is registered (and
   * to the raw string when `T` is `string`).
   */
  readonly selected: Signal<readonly { value: T; label: string }[]>;

  /** Id of the currently active option (drives `aria-activedescendant` on the input). */
  readonly activeId: Signal<string | null>;

  /** True when `value` includes `v` per the active equality function. */
  isSelected(value: T): boolean;

  /**
   * Activate by handle. Single mode replaces + closes + commits label. Multi
   * mode toggles in/out + stays open + (when `commitOnSelect`) clears the
   * query so the user can search the next item. No-op on disabled / readonly.
   */
  activate(handle: ForComboboxOptionHandle<T>): void;

  /** Remove a value from `value()`. Used by chip-remove and Backspace heuristics. */
  removeValue(value: T): void;

  /**
   * Clear value and (optionally) query. Used by `[forComboboxClear]` and
   * by the Backspace-on-empty-input heuristic. The query is reset only
   * when `clearQuery` is true.
   */
  clear(clearQuery?: boolean): void;

  toggle(): void;
  openOverlay(initialFocus?: ForComboboxInitialFocus): void;
  closeOverlay(reason: ForComboboxCloseReason): void;
}

/**
 * The combobox's piece-coordination surface: everything the library's own
 * pieces read off the root that a consumer has no call to touch — the
 * positioning mirrors `[forComboboxContent]` feeds to floating-ui, the ids the
 * ARIA wiring points at, the element slots, the label caches behind chip and
 * inline-completion rendering, the navigation and activation cursors, and the
 * outside-interaction emit forwarders `injectOverlayShell` drives.
 *
 * Deliberately **not** part of {@link ForComboboxContext} and never exported
 * from `public-api.ts`: these are the members a refactor of the anatomy moves,
 * so freezing them at 1.0 would freeze the anatomy with them.
 */
export interface ComboboxPieceContext<T = unknown> {
  readonly autocompleteMode: Signal<ForComboboxAutocomplete>;
  readonly openOnFocus: Signal<boolean>;
  readonly openOnQuery: Signal<boolean>;
  readonly commitOnSelect: Signal<boolean>;
  readonly clearOnQueryChange: Signal<boolean>;

  readonly dismissible: Signal<boolean>;
  /**
   * Whether focus returns to the `[forComboboxTrigger]` on close (picker
   * anatomy). Ignored in the editable anatomy, where focus never left the
   * input. Default `true`.
   */
  readonly returnFocus: Signal<boolean>;
  readonly side: Signal<FloatingSide | undefined>;
  readonly align: Signal<FloatingAlign>;
  readonly sideOffset: Signal<number>;
  readonly alignOffset: Signal<number>;
  readonly avoidCollisions: Signal<boolean>;
  readonly collisionPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
  readonly clipUntilPositioned: Signal<boolean>;
  readonly loop: Signal<boolean>;

  readonly inputId: Signal<string>;
  readonly contentId: Signal<string>;
  /**
   * Id of the `[forComboboxList]` listbox surface (picker anatomy). The input's
   * `aria-controls` points here when a list is registered; without one it falls
   * back to {@link contentId} (the editable anatomy where content itself is the
   * listbox).
   */
  readonly listId: Signal<string>;
  /**
   * Id of the element carrying `role="listbox"` — {@link listId} when a
   * `[forComboboxList]` is registered, otherwise {@link contentId}. The input
   * targets this with `aria-controls`.
   */
  readonly listboxId: Signal<string>;
  readonly ariaLabel: Signal<string | null>;

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * `[forComboboxAnchor]` when registered, otherwise falls back to the input.
   * Decoupled from `input` so the input keeps driving `aria-controls`,
   * `aria-activedescendant`, keyboard interaction, and its outside-pointer
   * exemption regardless of where the listbox paints.
   */
  readonly anchor: Signal<ReferenceElement | null>;
  readonly input: Signal<HTMLInputElement | null>;

  /**
   * The optional `[forComboboxTrigger]` button (picker anatomy). When present
   * it is the default positioning anchor (after an explicit `[forComboboxAnchor]`)
   * and the element focus returns to on close. `null` in the editable anatomy.
   */
  readonly trigger: Signal<HTMLElement | null>;

  readonly content: Signal<HTMLElement | null>;

  /**
   * The optional `[forComboboxList]` listbox surface (picker anatomy). When
   * registered, `[forComboboxContent]` drops its `role="listbox"` semantics and
   * becomes a neutral popup surface; the list carries the listbox role and owns
   * the options. `null` in the editable anatomy.
   */
  readonly list: Signal<HTMLElement | null>;
  /** True when a `[forComboboxList]` is registered (picker anatomy). */
  readonly hasList: Signal<boolean>;

  /** Multi-mode chip collection. Order follows DOM (= `value()` order in practice). */
  readonly chips: Signal<readonly ForComboboxChipHandle<T>[]>;

  /**
   * Non-selecting action collection (`[forComboboxAction]`), kept separate from
   * `options` so an action never appears in `value()`, `aria-setsize`, or
   * `aria-posinset`. Order follows DOM.
   */
  readonly actions: Signal<readonly ForComboboxActionHandle[]>;
  /**
   * True when at least one registered action is enabled. Gates the input's
   * Tab-into-actions behavior: with no enabled action, Tab keeps its default
   * "close the listbox and let Tab flow on" semantics.
   */
  readonly hasEnabledActions: Signal<boolean>;
  /**
   * Move DOM focus within the input↔actions ring (model A). The ring is
   * `[input, ...enabledActions]` in DOM order and wraps in both directions, so
   * focus cycles among the input and the pinned actions without ever leaving
   * (or dismissing) the open popup — Escape / outside-pointer remain the way
   * out. `fromActionId === null` means the move originates from the input; pass
   * the action's own id when moving from an action. A stale or disabled
   * `fromActionId` (e.g. an action disabled while it held focus) is resolved
   * against the full action collection, stepping to the nearest enabled
   * neighbor in the requested direction rather than snapping to the input. The
   * ring omits the input slot when no `[forComboboxInput]` is registered, so
   * focus cycles among the enabled actions instead of stranding. No-op when no
   * action is enabled.
   */
  moveActionFocus(fromActionId: string | null, direction: 'next' | 'prev'): void;

  /** Compare two items for equality. Defaults to `===`; overridden for object values. */
  readonly compareWith: Signal<(a: T, b: T) => boolean>;
  /** Render an item as a string label. Drives chip labels and `commitOnSelect` writes into the input. */
  readonly itemToStringLabel: Signal<(item: T) => string>;
  /** Serialize an item for the hidden input's `value` attribute. */
  readonly itemToFormValue: Signal<(item: T) => string>;

  /**
   * Scroll the current activedescendant option into view. Called by
   * `[forComboboxContent]` from the positioner's first-resolved-position hook so
   * the open-time auto-highlight seed survives the content portal move (which
   * resets `scrollTop`) and lands after the surface is sized. No-op while
   * virtualizing.
   */
  scrollActiveOptionIntoView(): void;
  /**
   * Cached entries for the currently selected values, in selection order.
   * Consumed by the chip label resolution and the root's `selected` fallback,
   * both of which must keep resolving a selected value's label after its option
   * leaves the rendered set — including across a query rebuild that no longer
   * contains it. A selected value whose option was never observed is absent
   * rather than represented; the caller falls back to `itemToStringLabel`.
   */
  selectedEntries(): readonly { id: string; value: T; label: string; disabled: boolean }[];
  /**
   * Cached entries inline-autocomplete matches against in the input directive.
   * Non-virtualized: the most recent non-empty option window, so an option
   * removed from the source stops being offered as a completion. Virtualized:
   * that window overlaid with the navigator's position map, so completion still
   * matches options scrolled out of view. Entries carry `disabled` so completion
   * skips disabled options.
   */
  completionEntries(): readonly { id: string; value: T; label: string; disabled: boolean }[];

  /**
   * Total number of options in the consumer's source array. Used for
   * `aria-setsize` and for navigation past the visible window when
   * virtualizing. Falls back to `options().length` when undefined.
   */
  readonly totalCount: Signal<number | undefined>;
  /** Inclusive-exclusive [start, end) range of options currently rendered when virtualizing. */
  readonly visibleRange: Signal<readonly [number, number] | undefined>;

  /** True when `id` is the activedescendant. */
  isActive(id: string): boolean;

  /**
   * Whether a pointer-suppression window is currently open. Opened whenever the
   * directive scrolls the active option into view during keyboard navigation,
   * so a synthetic `pointermove` fired because the scroll slid a different
   * option under a stationary cursor does not hijack the activedescendant.
   * Options consult this from their hover handler and skip the move while it
   * returns `true`.
   */
  isPointerSuppressed(): boolean;

  /** Move the activedescendant to the first / last / next / prev enabled option. */
  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void;
  /** Activate the option currently marked as activedescendant (Enter from the input). */
  activateActive(): boolean;

  /** Set the typed query. Emits inline completion / openOnQuery side-effects via the input directive. */
  setQueryFromInput(query: string): void;

  /** Where focus should land after the listbox opens. The input directive sets this before flipping `open`. */
  readonly initialFocus: Signal<ForComboboxInitialFocus>;

  /**
   * The reason of the most recent close (or `null` before any close / after a
   * fresh open). `[forComboboxContent]` reads this so a `'tab'` close skips the
   * return-focus move — Tab has already advanced focus and re-focusing the
   * trigger would steal it back. Only meaningful in the picker anatomy.
   */
  readonly lastCloseReason: Signal<ForComboboxCloseReason | null>;

  /**
   * Fires the `(autoFocusOnOpen)` output and returns whether the consumer
   * vetoed (called `preventDefault()`). The picker anatomy moves focus into the
   * input on open; a veto skips that imperative move. Editable anatomy never
   * calls this (focus never moves).
   */
  emitAutoFocusOnOpen(): boolean;
  /**
   * Fires the `(autoFocusOnClose)` output and returns whether the consumer
   * vetoed. The picker anatomy returns focus to the trigger on close; a veto
   * skips it.
   */
  emitAutoFocusOnClose(): boolean;

  /**
   * Escape is consumer-owned and routed through the input directive (focus
   * stays in the input), so it is invoked directly with the raw
   * `KeyboardEvent` rather than through the dismissible layer.
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
}

/**
 * DI token for the combobox's coordination surface, provided by `[forCombobox]`.
 * Publicly typed as the read surface {@link ForComboboxContext}, which is the whole of
 * what the token promises a consumer. The pieces read the same token at an internal type
 * that adds the registration protocol, so a wrapper re-providing it must alias it to the
 * root: `{ provide: FOR_COMBOBOX_CONTEXT, useExisting: MyCombobox }`, where `MyCombobox`
 * extends `ForCombobox`. A value that merely satisfies the declared type resolves too, and
 * is rejected in dev mode by the first piece to reach the protocol.
 *
 * `ForCombobox<T>`'s generic does NOT flow to this token: an `InjectionToken`
 * is a single runtime instance, so it is published at `ForComboboxContext<unknown>`.
 * `injectComboboxContext<T>()` re-applies `T` with an `as unknown as` cast, and
 * each piece (input, option, chip) relies on consumer discipline — the
 * `[forComboboxOption][value]` and the root `[(value)]` must be the same `T`.
 * There is no clean fix without abandoning the token pattern; the contract is
 * the consumer's to honor. Object identity is reconciled at runtime via
 * `compareWith`, which bounds the practical blast radius of a mismatch.
 */
export const FOR_COMBOBOX_CONTEXT = new InjectionToken<ForComboboxContext>('FOR_COMBOBOX_CONTEXT');

/**
 * The combobox's piece-registration protocol: how the input, the optional
 * anchor / trigger / list, the options, the chips and the actions wire
 * themselves into the `[forCombobox]` root, plus the two cursors the pieces set
 * (the activedescendant and the next open's initial-focus target).
 *
 * Deliberately **not** part of {@link ForComboboxContext} and never exported
 * from `public-api.ts`. It is the code most likely to be refactored, so a
 * consumer must not be able to name — let alone call — it.
 */
export interface ComboboxRegistrationContext<T = unknown> {
  /** Registers the `[forComboboxInput]` element. */
  registerInput(el: HTMLInputElement): void;
  /** Unregisters the input element. Reference-based. */
  unregisterInput(el: HTMLInputElement): void;
  /** Registers the optional `[forComboboxTrigger]` button (picker anatomy). */
  registerTrigger(el: HTMLElement): void;
  /** Unregisters the trigger button. Reference-based. */
  unregisterTrigger(el: HTMLElement): void;
  /** Registers the `[forComboboxContent]` popup surface. */
  registerContent(el: HTMLElement): void;
  /** Unregisters the popup surface. Reference-based. */
  unregisterContent(el: HTMLElement): void;
  /** Registers the optional `[forComboboxList]` listbox surface (picker anatomy). */
  registerList(el: HTMLElement): void;
  /** Unregisters the listbox surface. Reference-based. */
  unregisterList(el: HTMLElement): void;
  /** Registers an option so it joins the navigable collection in DOM order. */
  registerOption(handle: ForComboboxOptionHandle<T>): void;
  /** Unregisters an option. Reference-based. */
  unregisterOption(handle: ForComboboxOptionHandle<T>): void;
  /** Registers a multi-mode chip. Order follows DOM. */
  registerChip(handle: ForComboboxChipHandle<T>): void;
  /** Unregisters a chip. Reference-based. */
  unregisterChip(handle: ForComboboxChipHandle<T>): void;
  /** Registers a non-selecting `[forComboboxAction]`, kept out of the option collection. */
  registerAction(handle: ForComboboxActionHandle): void;
  /** Unregisters an action. Reference-based. */
  unregisterAction(handle: ForComboboxActionHandle): void;
  /** Set the activedescendant directly. Used by options on pointer-move and by the input on inline-completion seed. */
  setActiveId(id: string | null): void;
  /** Set where focus lands after the next open. The input directive calls it before flipping `open`. */
  setInitialFocus(target: ForComboboxInitialFocus): void;
}

/**
 * The combobox's internal coordination surface: everything
 * {@link ForComboboxContext} publishes plus the {@link ComboboxPieceContext}
 * members and the {@link ComboboxRegistrationContext} protocol.
 *
 * Never exported from `public-api.ts`. It is the type the pieces read
 * {@link FOR_COMBOBOX_CONTEXT} at, so a consumer who injects that token gets the
 * read surface while the pieces get the wiring protocol. `ForCombobox` declares
 * the members neither interface publishes TS-`private`, which keeps them out of
 * the emitted `.d.ts` while `useExisting` still satisfies this contract at
 * runtime.
 */
export interface ComboboxContext<T = unknown>
  extends ForComboboxContext<T>, ComboboxPieceContext<T>, ComboboxRegistrationContext<T> {}

/**
 * The constant half of both resolvers' {@link assertRootContext} calls, so the
 * injected and the explicit path state the same requirement.
 */
const ROOT_ASSERTION = {
  entryPoint: 'combobox',
  token: 'FOR_COMBOBOX_CONTEXT',
  root: '[forCombobox]',
};

/**
 * Resolve the surrounding combobox context, re-applying the caller's `T`. The
 * cast through `unknown` is unavoidable (see {@link FOR_COMBOBOX_CONTEXT}): the
 * token can't carry the per-instance generic, so `T` correctness is a
 * consumer-honored contract, not a compiler-enforced one.
 */
export function injectComboboxContext<T = unknown>(piece: string): ComboboxContext<T> {
  const ctx = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw orphanContextError({
      code: 'FORCDK-COMBOBOX-003',
      piece,
      root: '[forCombobox]',
      token: 'FOR_COMBOBOX_CONTEXT',
    });
  }
  const widened = ctx as unknown as ComboboxContext<T>;
  assertRootContext({
    ...ROOT_ASSERTION,
    piece,
    probe: () => widened.registerInput,
  });
  return widened;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forComboboxTrigger]` input carries one, the injected `FOR_COMBOBOX_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 *
 * The explicit reference is a public `ForComboboxContext`, so it is widened back
 * to the internal surface: the runtime object is always the `[forCombobox]`
 * root, which owns the registration protocol the public interface omits. Both
 * paths are guarded, on read rather than at injection time, because the explicit
 * one only resolves inside the `computed`; the explicit widening predates the
 * one-token collapse
 * and was never checked either.
 */
export function injectComboboxTriggerContext<T = unknown>(
  explicitRoot: Signal<ForComboboxContext<T> | ''>,
): Signal<ComboboxContext<T>> {
  const injected = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    const resolved = explicit === '' ? injected : explicit;
    if (!resolved) {
      throw unresolvedRootError({
        code: 'FORCDK-COMBOBOX-004',
        trigger: '[forComboboxTrigger]',
        root: '[forCombobox]',
        token: 'FOR_COMBOBOX_CONTEXT',
        exportAs: 'forCombobox',
      });
    }
    const widened = resolved as unknown as ComboboxContext<T>;
    assertRootContext({
      ...ROOT_ASSERTION,
      piece: 'ForComboboxTrigger',
      probe: () => widened.registerInput,
    });
    return widened;
  });
}
