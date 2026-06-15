import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl } from '@angular/forms/signals';

import { Collection } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { adoptHostId } from '../_internal/host-id/host-id';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import {
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
} from '../_internal/selection/selection';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_COMBOBOX_CONTEXT,
  type ForComboboxAutocomplete,
  type ForComboboxChipHandle,
  type ForComboboxCloseReason,
  type ForComboboxContext,
  type ForComboboxInitialFocus,
  type ForComboboxOptionHandle,
} from './combobox-context';
import { OptionLabelCache } from './combobox-label-cache';
import { tryReadHandle } from './combobox-snapshot-fold';
import { VirtualizedNavigator } from './combobox-virtualized-navigator';

/**
 * Headless implementation of the [WAI-ARIA combobox with listbox popup pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/).
 * Implements `FormValueControl<readonly T[]>` from `@angular/forms/signals`
 * for `[formField]` auto-wiring.
 *
 * Generic over the option value type `T` (default `string`). When the
 * consumer binds object items the directive infers `T` from `[(value)]`
 * and per-piece signatures (`[forComboboxOption][value]`,
 * `[forComboboxChip][value]`) specialize accordingly. Object identity is
 * resolved by the consumer-supplied `[isItemEqualToValue]` and labels by
 * `[itemToStringLabel]`; the hidden inputs serialize via
 * `[itemToFormValue]` (defaults to `JSON.stringify` for non-strings).
 *
 * Selection is always modeled as `readonly T[]`:
 * - In single mode (`multiple=false`, default), the array has 0 or 1
 *   element and option activation closes the listbox.
 * - In multi mode, option activation toggles in/out and the listbox stays
 *   open. Selected entries are typically rendered as chips inside
 *   `[forComboboxChips]` next to the input.
 *
 * The visible input ("query") and the form value are separate two-way
 * bindable models — the consumer keeps them in sync via filtering /
 * display logic, and the primitive only commits to `value` when an option
 * is explicitly activated.
 *
 * Filtering is **always** the consumer's responsibility — the primitive is
 * headless and doesn't filter the registered options. Render the filtered
 * subset with `@for` and the registry tracks them automatically.
 */
@Directive({
  selector: '[forCombobox]',
  exportAs: 'forCombobox',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_COMBOBOX_CONTEXT, useExisting: ForCombobox }],
})
export class ForCombobox<T = string>
  extends FormUiControlBase
  implements FormValueControl<readonly T[]>, ForComboboxContext<T>
{
  readonly #idGen = inject(IdGenerator);
  readonly #items = new Collection<ForComboboxOptionHandle<T>>();
  readonly #chips = new Collection<ForComboboxChipHandle<T>>();

  /**
   * Two-way bindable. Visible input text. The `model()` change emitter
   * (`(queryChange)`) fires only on internal mutations (option activation
   * commit, `clear()`, multi-mode select reset, picker-anatomy reset on
   * close), never on consumer writes via `[(query)]`.
   */
  readonly query = model<string>('');

  /**
   * Two-way bindable. Selected option values. Single mode (`multiple=false`)
   * keeps 0 or 1 element; multi mode keeps any number. The `model()` change
   * emitter (`(valueChange)`) fires only on internal selection changes,
   * never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly T[]>([]);

  /**
   * Compare two items for equality. Defaults to `===`, which is the
   * correct identity for primitive `T` (e.g. strings, numbers). Override
   * when binding object items so the directive can locate selected /
   * removed entries by id (or any other stable key) instead of by
   * reference: `[isItemEqualToValue]="(a, b) => a.id === b.id"`.
   */
  readonly isItemEqualToValue = input<(a: T, b: T) => boolean>((a, b) => a === b);

  /**
   * Render an item as a string label. Defaults to `String(item)`, which is
   * identity for strings. Drives the visible input text after activation
   * (when `commitOnSelect`) and the chip label fallback in multi mode.
   * Override when binding object items so the directive can fall back to
   * a meaningful label without relying on the option cache being warm:
   * `[itemToStringLabel]="(it) => it.name"`.
   */
  readonly itemToStringLabel = input<(item: T) => string>((item) => String(item));

  /**
   * Serialize an item for the hidden input that participates in native
   * form submission. Defaults to identity for strings and to
   * `JSON.stringify` for non-string items so the primitive works out of
   * the box round-tripping objects. Override to emit a specific wire
   * format — typically a per-item id — when the backend expects that:
   * `[itemToFormValue]="(it) => it.id"`.
   */
  readonly itemToFormValue = input<(item: T) => string>(defaultItemToFormValue);

  /**
   * Two-way bindable. Whether the listbox is currently shown. Internal
   * transitions: input typing (when `openOnQuery`), focus (when
   * `openOnFocus`), ArrowDown / ArrowUp, Escape, outside dismissal,
   * single-mode option activation.
   */
  readonly open = model<boolean>(false);

  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Autocomplete mode applied to the input. Mirrors the
   * [WAI-ARIA `aria-autocomplete` property](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#wai-ariaroles,states,andproperties)
   * and drives whether the listbox auto-opens on query and whether the
   * input gets inline-completed with the first match. Renamed from
   * `autocomplete` so consumers don't conflate it with the native HTML
   * `autocomplete` attribute (which the directive forces to `"off"`).
   */
  readonly autocompleteMode = input<ForComboboxAutocomplete>('list');

  /** Open the listbox when the input gains focus. Off by default — opening on query / arrow keys is the standard ecosystem behavior. */
  readonly openOnFocus = input(false, { transform: booleanAttribute });

  /** Open the listbox when the user starts typing. On by default. Only honored when `autocompleteMode` includes a listbox (`'list'` or `'both'`). */
  readonly openOnQuery = input(true, { transform: booleanAttribute });

  /**
   * In single mode, copy the activated option's label into `query`. In
   * multi mode, instead **clear** the query so the user can search the
   * next item. On by default in both. Set `false` to leave `query`
   * untouched on activation in either mode.
   *
   * Governs the **editable anatomy** only. In the picker anatomy (a
   * `[forComboboxTrigger]` is registered) the in-panel input is a transient
   * filter, not the value display: the single-mode label copy is always
   * skipped and `query` resets to `''` on close regardless of this flag.
   */
  readonly commitOnSelect = input(true, { transform: booleanAttribute });

  /** When the user edits the query, automatically clear the committed `value`. Off by default — most apps want the value preserved across query edits. Single-mode only. */
  readonly clearOnQueryChange = input(false, { transform: booleanAttribute });

  /**
   * Auto-highlight the first enabled option whenever the listbox is open
   * and no activedescendant is set (e.g. after the consumer's filter
   * removed the previously-active option). On by default — matches the
   * Headless UI / Material Autocomplete behavior. Set `false` for
   * Radix-style "user must arrow before anything is highlighted".
   */
  readonly autoHighlight = input(true, { transform: booleanAttribute });

  /**
   * Writing direction. Drives chip-cluster keyboard navigation (ArrowLeft /
   * ArrowRight semantics swap in RTL so they follow the visual order, not DOM
   * order) and the default `align` of the listbox (anchors to the right edge
   * of the input in RTL). When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins
   * and the resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Side the listbox is anchored to. Defaults to `'bottom'`. Pair with
   * `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>('bottom');

  /**
   * Alignment along the chosen `side`. When unset, defaults to `'start'`
   * in LTR and `'end'` in RTL (per `dir`). Set explicitly to pin an
   * alignment regardless of writing direction.
   *
   * The input is aliased to `align`; consumers bind `[align]="..."` and
   * read the effective value via the public `align` computed below.
   */
  readonly _alignInput = input<FloatingAlign | undefined>(undefined, { alias: 'align' });
  readonly align = computed<FloatingAlign>(
    () => this._alignInput() ?? (this.dir() === 'rtl' ? 'end' : 'start'),
  );

  /** Gap (px) between input and listbox along the main axis. Default `4`. */
  readonly sideOffset = input(4, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the listbox inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(8, { transform: numberAttribute });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the input is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });
  readonly loop = input(true, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the listbox. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /**
   * When true (default), focus returns to the `[forComboboxTrigger]` on close.
   * Only relevant in the picker anatomy (a trigger is registered) — in the
   * editable anatomy focus never leaves the input, so there is nothing to
   * return.
   */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on the listbox (`[forComboboxList]`, or `[forComboboxContent]` in the editable anatomy) when the input isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

  /**
   * Total number of options in the consumer's source array. Set when wiring
   * up a virtualized listbox (only the visible window is rendered) so the
   * directive can reflect `aria-setsize` and walk the snapshot for
   * navigation past the rendered range. Defaults to `undefined`, in which
   * case the directive falls back to `options().length` (the live registry).
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

  /**
   * Inclusive-exclusive `[start, end)` range of options currently rendered
   * in the DOM. Used by `navigate()` to translate "move to absolute
   * position N" into either an in-window highlight update or a request to
   * the consumer to scroll N into view (`(scrollToIndex)`). When
   * `undefined` (default), navigation assumes every option in the snapshot
   * is rendered — appropriate for non-virtualized lists.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Emitted when keyboard navigation needs to land on an option whose
   * absolute index falls outside `visibleRange()`. Wire this to the
   * consumer's virtualizer (`scrollToIndex(idx)` on `@tanstack/virtual`,
   * `virtua`, etc.); once the option mounts, the directive seeds
   * `aria-activedescendant` automatically.
   */
  readonly scrollToIndex = output<number>();

  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
  readonly interactOutside = output<VetoableNativeEvent<PointerEvent | FocusEvent>>();

  /**
   * _(picker anatomy only)_ Fires just before focus moves into the input on
   * open. Call `preventDefault()` on the emitted veto to skip the imperative
   * focus move. Only emitted when a `[forComboboxTrigger]` is registered — the
   * editable anatomy keeps focus in the input the whole time and has no move to
   * veto.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * _(picker anatomy only)_ Fires just before focus returns to the trigger on
   * close. Call `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly inputId = signal(this.#idGen.next('for-combobox-input'));
  readonly contentId = signal(this.#idGen.next('for-combobox-content'));
  readonly listId = signal(this.#idGen.next('for-combobox-list'));

  readonly #inputEl = signal<HTMLInputElement | null>(null);
  readonly input = this.#inputEl.asReadonly();

  readonly #anchorEl = signal<HTMLElement | null>(null);
  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();

  /**
   * Element floating-ui anchors the listbox against. Resolution order:
   * explicit `[forComboboxAnchor]` → `[forComboboxTrigger]` (picker anatomy) →
   * the input (editable anatomy fallback, so existing comboboxes keep their
   * behavior). Decoupled from `input` so the input keeps driving
   * `aria-controls`, `aria-activedescendant`, keyboard interaction, and its
   * dismissal exemption regardless of where the listbox paints.
   */
  readonly anchor = computed<ReferenceElement | null>(
    () => this.#anchorEl() ?? this.#triggerEl() ?? this.#inputEl(),
  );

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly #listEl = signal<HTMLElement | null>(null);
  readonly list = this.#listEl.asReadonly();
  /** True once a `[forComboboxList]` has registered (picker anatomy). */
  readonly hasList = computed(() => this.#listEl() !== null);
  /**
   * Id of the element carrying `role="listbox"`: the list when one is
   * registered (picker anatomy), otherwise the content surface (editable
   * anatomy). The input targets this with `aria-controls`.
   */
  readonly listboxId = computed(() => (this.hasList() ? this.listId() : this.contentId()));

  readonly options = this.#items.items;
  readonly chips = this.#chips.items;

  readonly #initialFocus = signal<ForComboboxInitialFocus>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #lastCloseReason = signal<ForComboboxCloseReason | null>(null);
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();

  /**
   * The activedescendant pointer. A `linkedSignal` so the
   * "what should be highlighted given open / items / autoHighlight" decision
   * is a **pure derivation**, never a write from an `effect` (the banned
   * state-propagation pattern). It is still writable for the genuinely
   * imperative moves that own their own scroll — arrow / Home / End
   * navigation, pointer-move hover, multi-mode activation, and the virtualized
   * pending-nav resolution (`navigate` / `seedFromIndexedSnapshot` /
   * `tryResolvePending` in `combobox-virtualized-navigator.ts`).
   *
   * The reset/seed rule, in order:
   * - On a `query` change the previously-active option may have been filtered
   *   out, so the prior pointer is dropped.
   * - A pointer that no longer matches a registered option is dropped
   *   (covers the consumer mutating the list without touching `query`).
   * - When a valid pointer survives, it is preserved (arrow nav, hover).
   * - Otherwise, in the **non-virtualized** case, auto-highlight seeds the
   *   first / last enabled option (per `initialFocus`) while the listbox is
   *   open. The virtualized case returns `null` here and the effect seeds it
   *   imperatively, because that seed must order options by absolute
   *   `posInSet` and must lose to a pending `(scrollToIndex)` resolution.
   */
  readonly #activeId = linkedSignal<
    {
      query: string;
      open: boolean;
      autoHighlight: boolean;
      virtualized: boolean;
      initialFocus: ForComboboxInitialFocus;
      items: readonly ForComboboxOptionHandle<T>[];
      value: readonly T[];
      equals: (a: T, b: T) => boolean;
    },
    string | null
  >({
    source: () => ({
      query: this.query(),
      open: this.open(),
      autoHighlight: this.autoHighlight(),
      virtualized: this.totalCount() !== undefined,
      initialFocus: this.#initialFocus(),
      items: this.#items.items(),
      value: this.value(),
      equals: this.isItemEqualToValue(),
    }),
    computation: (
      { query, open, autoHighlight, virtualized, initialFocus, items, value, equals },
      prev,
    ) => {
      const queryChanged = prev !== undefined && prev.source.query !== query;
      let current = queryChanged ? null : (prev?.value ?? null);
      if (current !== null && !items.some((o) => o.id() === current)) {
        current = null;
      }
      if (current !== null) {
        return current;
      }
      if (virtualized || !autoHighlight || !open || items.length === 0) {
        return null;
      }
      if (initialFocus === 'selected') {
        const selected = findSelectedEnabled(items, value, equals);
        if (selected === NOT_READY) {
          return null;
        }
        if (selected) {
          return selected.id();
        }
      }
      const target = initialFocus === 'last' ? findLastEnabled(items) : findFirstEnabled(items);
      return target?.id() ?? null;
    },
  });
  readonly activeId = this.#activeId.asReadonly();

  /**
   * Always-on label cache — keeps `{ id, value, label }` tuples across
   * close/open and scroll-out-of-view to drive inline autocomplete matching
   * and the `selected` label fallback. See `combobox-label-cache.ts`.
   */
  readonly #labelCache = new OptionLabelCache<T>({
    items: this.#items.items,
    totalCount: this.totalCount,
  });

  /**
   * Virtualization navigation engine — constructed lazily the first time the
   * consumer sets `totalCount()`, so a non-virtualized combobox never pulls
   * the position-map machinery. Powers keyboard navigation past the rendered
   * window and the scrolled-out-of-view label fallback.
   */
  #navigator: VirtualizedNavigator<T> | null = null;

  #requireNavigator(): VirtualizedNavigator<T> {
    return (this.#navigator ??= new VirtualizedNavigator<T>({
      items: this.#items.items,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      loop: this.loop,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#activeId.set(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
    }));
  }

  readonly selected = computed<readonly { value: T; label: string }[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    // `cachedOptions()` already merges off-window entries from the indexed
    // snapshot when virtualizing, so a selected option scrolled out of view
    // still resolves here without a separate position-map lookup.
    const cached = this.cachedOptions();
    const equals = this.isItemEqualToValue();
    const toLabel = this.itemToStringLabel();
    return values.map((v) => {
      const opt = cached.find((o) => equals(o.value, v));
      if (opt) {
        return { value: v, label: opt.label };
      }
      // Fall back to the consumer-provided label fn so non-string items
      // still render a meaningful string before the option cache warms up.
      return { value: v, label: typeof v === 'string' ? (v as string) : toLabel(v) };
    });
  });

  /**
   * Read-only single-select convenience view of {@link value}. Returns the
   * sole selected item when exactly one is selected, otherwise `null` (empty
   * selection, or multiple selections in `multiple` mode). Lets single-select
   * consumers read `selectedItem()` instead of unwrapping `value()[0]`. The
   * array-backed `value` model remains the source of truth and the
   * `FormValueControl` contract; this is a derived accessor. Distinct from
   * {@link selected}, which pairs every selected value with its resolved
   * label for chip rendering.
   */
  readonly selectedItem = singleSelected(this.value);

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.input();
  }

  protected override fieldLabelledElementId(): string {
    return this.inputId();
  }

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });

    // This effect owns only the *imperative* tail of the auto-highlight flow;
    // the activedescendant decision itself is a pure derivation inside the
    // `#activeId` linkedSignal above. It reacts to `#items.items()`,
    // `autoHighlight()` and `open()` and:
    //
    // 1. Primes the label cache. `#labelCache.prime()` eagerly pulls the label
    //    cache so its `linkedSignal` `prev` slot gets seeded while the listbox
    //    is open — without it the lazy cache never runs during the open cycle
    //    in non-virtualized usage and persistence across close→re-open would
    //    start from an empty `prev`. The virtualization navigator (and its
    //    position-map) is primed only when the consumer set `totalCount()`, so
    //    a plain combobox never builds it.
    // 2. Virtualized only: resolves a pending `(scrollToIndex)` navigation —
    //    once the option for the requested posInSet mounts, `tryResolvePending`
    //    seeds activedescendant to its id and scrolls it into view. This is the
    //    single sanctioned `#activeId` write from an effect, and it is a
    //    legitimate side effect (not state propagation): it integrates the
    //    consumer's virtualizer mounting a row asynchronously, and it must win
    //    over the auto-highlight seed — which is why the virtualized seed can't
    //    live in the linkedSignal. `seedFromIndexedSnapshot` then seeds the
    //    topmost / bottommost *rendered* enabled option (ordered by absolute
    //    `posInSet`) deliberately passively — it only moves the pointer, never
    //    the consumer's scroll position (see `combobox-virtualized-navigator.ts`).
    // 3. Non-virtualized: scrolls the auto-highlight-seeded option into view so
    //    a seed that lands below the fold is visible, for parity with
    //    `navigate()`. The seed itself comes from the linkedSignal; this is its
    //    imperative tail. `#activeId` is read `untracked` so the scroll never
    //    re-triggers the effect, and pointer-move hover doesn't reach here (it
    //    changes none of the tracked reads), so hovering never scrolls.
    effect(() => {
      this.#labelCache.prime();
      const items = this.#items.items();
      const open = this.open();
      const autoHighlight = this.autoHighlight();
      const virtualized = this.totalCount() !== undefined;

      if (virtualized) {
        const navigator = this.#requireNavigator();
        navigator.prime();
        if (navigator.tryResolvePending()) {
          return;
        }
        if (
          autoHighlight &&
          open &&
          untracked(() => this.#activeId()) === null &&
          items.length > 0
        ) {
          navigator.seedFromIndexedSnapshot(this.#initialFocus() === 'last' ? 'last' : 'first');
        }
        return;
      }

      if (!open) {
        return;
      }
      const activeId = untracked(() => this.#activeId());
      if (activeId === null) {
        return;
      }
      const active = items.find((o) => o.id() === activeId);
      // `scrollIntoView` is missing in some test environments — safe-call.
      active?.host.scrollIntoView?.({ block: 'nearest' });
    });
  }

  registerInput(el: HTMLInputElement): void {
    adoptHostId(el, this.inputId);
    this.#inputEl.set(el);
  }
  unregisterInput(el: HTMLInputElement): void {
    if (this.#inputEl() === el) {
      this.#inputEl.set(null);
    }
  }

  registerAnchor(el: HTMLElement): void {
    const current = this.#anchorEl();
    if (current !== null && current !== el) {
      throw new Error(
        '[forty-cdk/combobox] Multiple [forComboboxAnchor] inside the same [forCombobox]; only one is allowed.',
      );
    }
    this.#anchorEl.set(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    if (this.#anchorEl() === el) {
      this.#anchorEl.set(null);
    }
  }

  registerTrigger(el: HTMLElement): void {
    this.#triggerEl.set(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    if (this.#triggerEl() === el) {
      this.#triggerEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    adoptHostId(el, this.contentId);
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerList(el: HTMLElement): void {
    adoptHostId(el, this.listId);
    this.#listEl.set(el);
  }
  unregisterList(el: HTMLElement): void {
    if (this.#listEl() === el) {
      this.#listEl.set(null);
    }
  }

  registerOption(handle: ForComboboxOptionHandle<T>): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: ForComboboxOptionHandle<T>): void {
    this.#items.unregister(handle);
    if (this.#activeId() === handle.id()) {
      this.#activeId.set(null);
    }
  }

  registerChip(handle: ForComboboxChipHandle<T>): void {
    this.#chips.register(handle);
  }
  unregisterChip(handle: ForComboboxChipHandle<T>): void {
    this.#chips.unregister(handle);
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.isItemEqualToValue());
  }

  isActive(id: string): boolean {
    return this.#activeId() === id;
  }

  activate(handle: ForComboboxOptionHandle<T>): void {
    if (this.effectiveDisabled() || this.readonly() || handle.disabled()) {
      return;
    }
    const v = handle.value();
    if (this.multiple()) {
      // Toggle in/out of the array. Stay open so the user can keep picking.
      this.value.set(toggleInArray(this.value(), v, this.isItemEqualToValue()));
      if (this.commitOnSelect()) {
        // Reset query so the next typed prefix searches afresh — matches
        // Base UI / Material Autocomplete multi behavior.
        this.query.set('');
        this.#syncInputValue('');
      }
      this.#activeId.set(handle.id());
      return;
    }
    // Single mode: replace + close + commit label.
    this.value.set([v]);
    if (this.commitOnSelect() && this.trigger() === null) {
      this.query.set(handle.label());
      this.#syncInputValue(handle.label());
    }
    this.closeMenu('select');
  }

  /**
   * Imperatively align the visible `<input>` text with `query()` even
   * while the input has focus. The directive's reactive sync skips
   * focused syncs to avoid clobbering inline-autocomplete selection
   * during typing — but activation / clear writes happen *outside* the
   * typing flow and should be visible immediately.
   */
  #syncInputValue(value: string): void {
    const el = this.#inputEl();
    if (el && el.value !== value) {
      el.value = value;
    }
  }

  removeValue(v: T): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const equals = this.isItemEqualToValue();
    const current = this.value();
    if (!current.some((x) => equals(x, v))) {
      return;
    }
    this.value.set(current.filter((x) => !equals(x, v)));
  }

  activateActive(): boolean {
    const id = this.#activeId();
    if (!id) {
      return false;
    }
    const handle = this.#items.items().find((o) => o.id() === id);
    if (!handle || handle.disabled()) {
      return false;
    }
    this.activate(handle);
    return true;
  }

  navigate(direction: 'next' | 'prev' | 'first' | 'last'): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.totalCount() !== undefined) {
      this.#requireNavigator().navigate(direction);
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentId = this.#activeId();
    const currentIndex = currentId === null ? -1 : items.findIndex((o) => o.id() === currentId);

    // No activedescendant yet + arrow nav: jump to the natural extreme
    // (ArrowDown → first enabled, ArrowUp → last enabled).
    let action = direction;
    if (currentIndex < 0 && direction === 'next') {
      action = 'first';
    } else if (currentIndex < 0 && direction === 'prev') {
      action = 'last';
    }

    const next = moveIndex(currentIndex, items.length, action, {
      loop: this.loop(),
      isDisabled: (i) => items[i]!.disabled(),
    });
    if (next === null) {
      return;
    }
    const target = items[next];
    if (!target) {
      return;
    }
    this.#activeId.set(target.id());
    // Scroll the active option into view inside the listbox surface
    // (`scrollIntoView` is missing in some test environments — safe-call).
    target.host.scrollIntoView?.({ block: 'nearest' });
  }

  setQueryFromInput(query: string): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.query.set(query);
    if (this.clearOnQueryChange() && !this.multiple() && this.value().length > 0) {
      this.value.set([]);
    }
    const mode = this.autocompleteMode();
    const hasListbox = mode === 'list' || mode === 'both';
    if (this.openOnQuery() && hasListbox && query.length > 0 && !this.open()) {
      this.openMenu();
    }
  }

  setActiveId(id: string | null): void {
    this.#activeId.set(id);
  }

  readonly #cachedOptionsMemo = computed<readonly { id: string; value: T; label: string }[]>(() => {
    const live = this.#labelCache.entries();
    if (this.totalCount() === undefined) {
      return live;
    }
    // Virtualized: merge in entries that previously rendered so typeahead and
    // inline autocomplete can match against options scrolled out of view. The
    // live entries take precedence (freshest data) and appear first, followed
    // by off-window indexed entries sorted by absolute position.
    const indexed = this.#requireNavigator().snapshotByPos();
    if (indexed.size === 0) {
      return live;
    }
    const seen = new Set(live.map((o) => o.id));
    const merged: { id: string; value: T; label: string }[] = [...live];
    const positions = [...indexed.keys()].sort((a, b) => a - b);
    for (const pos of positions) {
      const entry = indexed.get(pos)!;
      if (seen.has(entry.id)) continue;
      merged.push({ id: entry.id, value: entry.value, label: entry.label });
    }
    return merged;
  });

  cachedOptions(): readonly { id: string; value: T; label: string }[] {
    return this.#cachedOptionsMemo();
  }

  clear(clearQuery: boolean = true): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.value.set([]);
    if (clearQuery) {
      this.query.set('');
      this.#syncInputValue('');
    }
    this.#activeId.set(null);
  }

  setInitialFocus(target: ForComboboxInitialFocus): void {
    this.#initialFocus.set(target);
  }

  toggle(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(this.trigger() !== null ? 'selected' : 'first');
    }
  }

  openMenu(initialFocus: ForComboboxInitialFocus = 'first'): void {
    if (this.effectiveDisabled() || this.open()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
    this.open.set(true);
  }

  closeMenu(reason: ForComboboxCloseReason): void {
    if (!this.open()) {
      return;
    }
    this.#lastCloseReason.set(reason);
    this.open.set(false);
    this.#activeId.set(null);
    this.#navigator?.resetPending();
    if (this.trigger() !== null) {
      this.query.set('');
      this.#syncInputValue('');
    }
  }

  /** Fire `(autoFocusOnOpen)` and report whether the consumer vetoed the focus move. */
  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  /** Fire `(autoFocusOnClose)` and report whether the consumer vetoed the return-focus. */
  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside` lives in `injectOverlayShell`; these only fire the
   * matching output with the veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.pointerDownOutside.emit(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.focusOutside.emit(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.interactOutside.emit(veto);
  }

  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction. Marks the control touched and closes with the channel's
   * reason.
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.markTouched();
    this.closeMenu(reason);
  }

  override markTouched(): void {
    super.markTouched();
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    const inputEl = this.#inputEl();
    const content = this.#contentEl();
    if (next) {
      if (inputEl && inputEl.contains(next)) {
        return;
      }
      if (content && content.contains(next)) {
        return;
      }
      // Focus moving to a chip (multi mode) is "inside" — chips are an
      // extension of the input area, not an outside boundary.
      const chips = this.#chips.items();
      for (const chip of chips) {
        if (chip.host.contains(next)) {
          return;
        }
      }
    }
    this.markTouched();
  }
}

function findFirstEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
): ForComboboxOptionHandle<T> | null {
  for (const item of items) {
    if (!item.disabled()) {
      return item;
    }
  }
  return null;
}

function findLastEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
): ForComboboxOptionHandle<T> | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item && !item.disabled()) {
      return item;
    }
  }
  return null;
}

const NOT_READY = Symbol('forty-cdk/combobox:not-ready');

function findSelectedEnabled<T>(
  items: readonly ForComboboxOptionHandle<T>[],
  values: readonly T[],
  equals: (a: T, b: T) => boolean,
): ForComboboxOptionHandle<T> | null | typeof NOT_READY {
  if (values.length === 0) {
    return null;
  }
  for (const item of items) {
    if (item.disabled()) {
      continue;
    }
    const read = tryReadHandle(() => ({ value: item.value() }));
    if (read === null) {
      return NOT_READY;
    }
    if (values.some((sel) => equals(read.value, sel))) {
      return item;
    }
  }
  return null;
}
