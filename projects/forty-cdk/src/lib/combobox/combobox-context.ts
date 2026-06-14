import { computed, inject, InjectionToken, type ModelSignal, type Signal } from '@angular/core';
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

/**
 * Where the auto-highlight seed lands when the listbox opens. `'first'` / `'last'`
 * bias to the natural extreme (e.g. ArrowDown / ArrowUp on the trigger). `'selected'`
 * — used by the picker trigger's plain open — seeds the committed selection, falling
 * back to the first enabled option when there is no selection or it is filtered out.
 */
export type ForComboboxInitialFocus = 'first' | 'last' | 'selected';

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
  readonly arrowPadding: Signal<number>;
  readonly sticky: Signal<'partial' | 'always' | false>;
  readonly hideWhenDetached: Signal<boolean>;
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
  registerInput(el: HTMLInputElement): void;
  unregisterInput(el: HTMLInputElement): void;

  /**
   * Register / unregister an optional `[forComboboxAnchor]` positioning
   * element. At most one anchor per root; a second registration throws.
   * Reference-based unregister, so an anchor torn down inside `@if` restores
   * the input fallback cleanly.
   */
  registerAnchor(el: HTMLElement): void;
  unregisterAnchor(el: HTMLElement): void;

  /**
   * The optional `[forComboboxTrigger]` button (picker anatomy). When present
   * it is the default positioning anchor (after an explicit `[forComboboxAnchor]`)
   * and the element focus returns to on close. `null` in the editable anatomy.
   */
  readonly trigger: Signal<HTMLElement | null>;
  registerTrigger(el: HTMLElement): void;
  unregisterTrigger(el: HTMLElement): void;

  readonly content: Signal<HTMLElement | null>;
  registerContent(el: HTMLElement): void;
  unregisterContent(el: HTMLElement): void;

  /**
   * The optional `[forComboboxList]` listbox surface (picker anatomy). When
   * registered, `[forComboboxContent]` drops its `role="listbox"` semantics and
   * becomes a neutral popup surface; the list carries the listbox role and owns
   * the options. `null` in the editable anatomy.
   */
  readonly list: Signal<HTMLElement | null>;
  /** True when a `[forComboboxList]` is registered (picker anatomy). */
  readonly hasList: Signal<boolean>;
  registerList(el: HTMLElement): void;
  unregisterList(el: HTMLElement): void;

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
  readonly initialFocus: Signal<ForComboboxInitialFocus>;
  setInitialFocus(target: ForComboboxInitialFocus): void;

  toggle(): void;
  openMenu(initialFocus?: ForComboboxInitialFocus): void;
  closeMenu(reason: ForComboboxCloseReason): void;

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

/**
 * `ForCombobox<T>`'s generic does NOT flow to this token: an `InjectionToken`
 * is a single runtime instance, so it is published at `ForComboboxContext<unknown>`.
 * `injectComboboxContext<T>()` re-applies `T` with an `as unknown as` cast, and
 * each piece (input, option, chip) relies on consumer discipline — the
 * `[forComboboxOption][value]` and the root `[(value)]` must be the same `T`.
 * There is no clean fix without abandoning the token pattern; the contract is
 * the consumer's to honor. Object identity is reconciled at runtime via
 * `isItemEqualToValue`, which bounds the practical blast radius of a mismatch.
 */
export const FOR_COMBOBOX_CONTEXT = new InjectionToken<ForComboboxContext>('FOR_COMBOBOX_CONTEXT');

/**
 * Resolve the surrounding combobox context, re-applying the caller's `T`. The
 * cast through `unknown` is unavoidable (see {@link FOR_COMBOBOX_CONTEXT}): the
 * token can't carry the per-instance generic, so `T` correctness is a
 * consumer-honored contract, not a compiler-enforced one.
 */
export function injectComboboxContext<T = unknown>(piece: string): ForComboboxContext<T> {
  const ctx = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  if (!ctx) {
    throw new Error(
      `[forty-cdk/combobox] ${piece} must be used inside a [forCombobox] element. ` +
        "If it is declared inside an ng-template, DI resolves at the template's declaration site — " +
        'not where it is stamped (e.g. via ngTemplateOutlet) — so declare the template inside the ' +
        '[forCombobox] root.',
    );
  }
  return ctx as unknown as ForComboboxContext<T>;
}

/**
 * Resolves the trigger's root context: the explicit reference when the
 * `[forComboboxTrigger]` input carries one, the injected `FOR_COMBOBOX_CONTEXT`
 * otherwise. The orphan error only fires when neither resolves, on first read
 * of the returned signal. Must be called in an injection context.
 */
export function injectComboboxTriggerContext<T = unknown>(
  explicitRoot: Signal<ForComboboxContext<T> | ''>,
): Signal<ForComboboxContext<T>> {
  const injected = inject(FOR_COMBOBOX_CONTEXT, { optional: true });
  return computed(() => {
    const explicit = explicitRoot();
    if (explicit !== '') {
      return explicit;
    }
    if (injected) {
      return injected as unknown as ForComboboxContext<T>;
    }
    throw new Error(
      '[forty-cdk/combobox] ForComboboxTrigger could not resolve its [forCombobox] root: ' +
        'no FOR_COMBOBOX_CONTEXT provider is visible and no explicit root reference was passed. ' +
        "If this trigger is declared inside an ng-template, DI resolves at the template's declaration " +
        'site — not where it is stamped — so either declare the template inside the root or pass the ' +
        'root explicitly: [forComboboxTrigger]="root" with #root="forCombobox".',
    );
  });
}
