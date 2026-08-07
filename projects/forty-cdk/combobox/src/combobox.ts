import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  inject,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  Collection,
  type FloatingAlign,
  type FloatingSide,
  FormUiControlBase,
  injectHiddenInput,
  type WritingDirection,
  nextEnabledHandle,
  createPointerSuppression,
  type PointerSuppression,
  defaultItemToFormValue,
  isInArray,
  isUnset,
  singleSelected,
  toggleInArray,
  injectTextDirection,
  ElementRegistry,
  CloseReasonState,
  InitialFocusState,
  emitVetoableEvent,
  emitVetoableNativeEvent,
  LabelCache,
  type LabelCacheEntry,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import { createActiveIdSignal, runAutoHighlightBridge } from './combobox-auto-highlight';
import {
  FOR_COMBOBOX_CONTEXT,
  type ForComboboxActionHandle,
  type ForComboboxAutocomplete,
  type ForComboboxChipHandle,
  type ForComboboxCloseReason,
  type ForComboboxContext,
  type ForComboboxInitialFocus,
  type ForComboboxOptionHandle,
} from './combobox-context';
import { FOR_COMBOBOX_DEFAULTS } from './combobox-defaults';
import { mergeOffWindowEntries } from './combobox-off-window-merge';
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
 * resolved by the consumer-supplied `[compareWith]` and labels by
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
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_COMBOBOX_CONTEXT, useExisting: ForCombobox }],
})
export class ForCombobox<T = string>
  extends FormUiControlBase
  implements FormValueControl<readonly T[]>, ForComboboxContext<T>
{
  readonly #registry = inject(ElementRegistry);
  readonly #defaults = inject(FOR_COMBOBOX_DEFAULTS);
  readonly #items = new Collection<ForComboboxOptionHandle<T>>();
  readonly #chips = new Collection<ForComboboxChipHandle<T>>();
  readonly #actions = new Collection<ForComboboxActionHandle>();

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
   * reference: `[compareWith]="(a, b) => a.id === b.id"`.
   */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

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

  /**
   * Whether several options can be selected. In multi mode activation toggles an option and the
   * listbox stays open; single mode keeps `value` at 0 or 1 element and closes on select.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Autocomplete mode applied to the input. Mirrors the
   * [WAI-ARIA `aria-autocomplete` property](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/#wai-ariaroles,states,andproperties)
   * and drives whether the listbox auto-opens on query and whether the
   * input gets inline-completed with the first match. Renamed from
   * `autocomplete` so consumers don't conflate it with the native HTML
   * `autocomplete` attribute (which the directive forces to `"off"`).
   *
   * Pure `'inline'` never opens the popup (per APG), so in the default
   * `@if (open())` anatomy no `[forComboboxOption]` renders and the label
   * cache starts cold — a first keystroke into a never-opened inline combobox
   * completes against nothing. Inline completion only works once the options
   * have rendered at least once (the user opened the popup via ArrowDown /
   * `openOnFocus`, warming the cache). Prefer `'both'` when a popup is
   * acceptable, or keep the options mounted, if completion must work from the
   * very first keystroke.
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
   * removed the previously-active option). On by default. Set `false` for
   * "user must arrow before anything is highlighted" behavior.
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
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the listbox inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /** Padding (px) applied uniformly to flip / shift / size. Default `8`. */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

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
  /**
   * Whether arrow navigation wraps past the first / last enabled option.
   */
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
   * Optional virtualized-only seam that tells the directive the source dataset
   * changed **without** a `totalCount` transition — a same-length re-sort or
   * refresh (e.g. sorting a 1000-row list). Bind any value that changes on such
   * a refresh (a version counter, the array reference, a sort-key string); when
   * it changes the position snapshot rebuilds from empty so navigation never
   * resolves against a stale off-window entry. Leave unset (default) when the
   * dataset only ever changes length. Equivalent to calling
   * {@link ForCombobox.invalidateSnapshot} imperatively.
   */
  readonly dataVersion = input<unknown>();

  /**
   * Emitted when keyboard navigation needs to land on an option whose
   * absolute index falls outside `visibleRange()`. Wire this to the
   * consumer's virtualizer (`scrollToIndex(idx)` on `@tanstack/virtual`,
   * `virtua`, etc.); once the option mounts, the directive seeds
   * `aria-activedescendant` automatically.
   */
  readonly scrollToIndex = output<number>();

  /** Emitted before Escape closes the listbox. Call `preventDefault()` to keep it open. */
  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();

  /** Emitted before an outside pointer-down closes the listbox. Vetoable with `preventDefault()`. */
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();

  /** Emitted before focus leaving the surface closes the listbox. Vetoable with `preventDefault()`. */
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();

  /**
   * Emitted alongside {@link pointerDownOutside} and {@link focusOutside} for consumers that do not
   * care which one occurred. A `preventDefault()` on either channel suppresses the close.
   */
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

  readonly #inputSlot = this.#registry.identifiedSlot<HTMLInputElement>('for-combobox', 'input');
  readonly #contentSlot = this.#registry.identifiedSlot('for-combobox', 'content');
  readonly #listSlot = this.#registry.identifiedSlot('for-combobox', 'list');
  readonly #triggerSlot = this.#registry.elementSlot();
  readonly #anchorSlot = this.#registry.anchorSlot(
    '[forty-cdk/combobox] Multiple [forComboboxAnchor] inside the same [forCombobox]; only one is allowed.',
  );

  readonly inputId = this.#inputSlot.id;
  readonly contentId = this.#contentSlot.id;
  readonly listId = this.#listSlot.id;

  readonly input = this.#inputSlot.element;

  readonly trigger = this.#triggerSlot.element;

  /**
   * Element floating-ui anchors the listbox against. Resolution order:
   * explicit `[forComboboxAnchor]` → `[forComboboxTrigger]` (picker anatomy) →
   * the input (editable anatomy fallback, so existing comboboxes keep their
   * behavior). Decoupled from `input` so the input keeps driving
   * `aria-controls`, `aria-activedescendant`, keyboard interaction, and its
   * dismissal exemption regardless of where the listbox paints.
   */
  readonly anchor = this.#anchorSlot.resolve(this.#triggerSlot.element, this.#inputSlot.element);

  readonly content = this.#contentSlot.element;

  readonly list = this.#listSlot.element;
  /** True once a `[forComboboxList]` has registered (picker anatomy). */
  readonly hasList = computed(() => this.#listSlot.element() !== null);
  /**
   * Id of the element carrying `role="listbox"`: the list when one is
   * registered (picker anatomy), otherwise the content surface (editable
   * anatomy). The input targets this with `aria-controls`.
   */
  readonly listboxId = computed(() => (this.hasList() ? this.listId() : this.contentId()));

  readonly options = this.#items.items;
  readonly chips = this.#chips.items;
  readonly actions = this.#actions.items;
  readonly hasEnabledActions = computed(() => this.#actions.items().some((a) => !a.disabled()));

  readonly #initialFocusState = new InitialFocusState<ForComboboxInitialFocus>('first');
  readonly initialFocus = this.#initialFocusState.target;

  readonly #closeReasonState = new CloseReasonState<ForComboboxCloseReason>();
  readonly lastCloseReason = this.#closeReasonState.reason;

  /**
   * The activedescendant pointer. Built by {@link createActiveIdSignal} as a
   * `linkedSignal` so the highlight decision is a pure derivation, never a write
   * from an `effect`; it stays writable for the imperative moves that own their
   * own scroll (arrow / Home / End navigation, hover, multi-mode activation, and
   * the virtualized pending-nav resolution). The reset/seed rule lives with the
   * factory in `combobox-auto-highlight.ts`.
   */
  readonly #activeId = createActiveIdSignal<T>({
    query: this.query,
    open: this.open,
    autoHighlight: this.autoHighlight,
    virtualized: () => this.totalCount() !== undefined,
    initialFocus: this.#initialFocusState.target,
    items: this.#items.items,
    value: this.value,
    equals: this.compareWith,
  });
  readonly activeId = this.#activeId.asReadonly();

  #lastPositionedId: string | null = null;

  readonly #pointerSuppression: PointerSuppression = createPointerSuppression();

  /**
   * Bounded option-label cache, shared with `[forSelect]` through
   * `forty-cdk/core`. Keeps `{ id, value, label, disabled }` tuples across
   * close/open in two projections: the selection-keyed one backs
   * {@link selected}'s chip labels (bounded by the selection, so a long-lived
   * remote-search combobox retains the labels of what is selected and nothing
   * else), and the last-window one backs {@link completionEntries} for inline
   * autocomplete. Off-window matching while virtualizing comes from the
   * navigator's position map instead — see {@link completionEntries}.
   */
  readonly #labelCache = new LabelCache<T>({
    items: this.#items.items,
    value: this.value,
    itemToFormValue: this.itemToFormValue,
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
      scrollActiveIntoView: (host) => this.#scrollActiveIntoView(host),
      dataVersion: this.dataVersion,
    }));
  }

  /**
   * Force the virtualized position snapshot to rebuild from empty on the next
   * fold, discarding stale off-window entries. Call after a same-length dataset
   * refresh (a re-sort / reload that keeps `totalCount` unchanged) when you
   * cannot express the change through the reactive `[dataVersion]` input. No-op
   * when the combobox is not virtualized (`totalCount` unset).
   */
  invalidateSnapshot(): void {
    if (this.totalCount() === undefined) {
      return;
    }
    this.#requireNavigator().invalidateSnapshot();
  }

  readonly selected = computed<readonly { value: T; label: string }[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    const cached = this.selectedEntries();
    const equals = this.compareWith();
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

  /**
   * Move focus to the `role="combobox"` input, implementing
   * `FormValueControl.focus` from `@angular/forms/signals`. Without this override
   * Signal Forms would focus the host `[forCombobox]` wrapper — which carries no
   * focusable role — so focus-on-error would silently go nowhere. No-op when
   * disabled or before the input has registered.
   */
  override focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.input()?.focus(options);
  }

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });

    // @sanctioned-pull(label-cache-window): the option window exists only while
    // the listbox is open, and the closed-state fallback reading it has no
    // reader during that cycle.
    effect(() => {
      this.#labelCache.prime();
    });

    // The activedescendant *decision* is a pure derivation in `#activeId`; this
    // effect runs only its imperative tail (virtualized pending-nav resolution +
    // passive seed, non-virtualized scroll-into-view). It is the library's one
    // pull sharing an effect with writes: the position map's sources are the ones
    // the bridge already tracks, so priming it widens nothing. Full rationale
    // lives with `runAutoHighlightBridge` in `combobox-auto-highlight.ts`.
    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runAutoHighlightBridge<T>({
        requireNavigator: () => this.#requireNavigator(),
        items: this.#items.items,
        open: this.open,
        autoHighlight: this.autoHighlight,
        virtualized: () => this.totalCount() !== undefined,
        initialFocus: this.#initialFocusState.target,
        getActiveId: () => this.#activeId(),
        getLastPositionedId: () => this.#lastPositionedId,
        setLastPositionedId: (id) => (this.#lastPositionedId = id),
      });
    });
  }

  private registerInput(el: HTMLInputElement): void {
    this.#inputSlot.register(el);
  }
  private unregisterInput(el: HTMLInputElement): void {
    this.#inputSlot.unregister(el);
  }

  /** See {@link ForComboboxContext.registerAnchor}. */
  registerAnchor(el: HTMLElement): void {
    this.#anchorSlot.register(el);
  }
  /** See {@link ForComboboxContext.unregisterAnchor}. */
  unregisterAnchor(el: HTMLElement): void {
    this.#anchorSlot.unregister(el);
  }

  private registerTrigger(el: HTMLElement): void {
    this.#triggerSlot.register(el);
  }
  private unregisterTrigger(el: HTMLElement): void {
    this.#triggerSlot.unregister(el);
  }

  private registerContent(el: HTMLElement): void {
    this.#contentSlot.register(el);
  }
  private unregisterContent(el: HTMLElement): void {
    this.#contentSlot.unregister(el);
  }

  private registerList(el: HTMLElement): void {
    this.#listSlot.register(el);
  }
  private unregisterList(el: HTMLElement): void {
    this.#listSlot.unregister(el);
  }

  private registerOption(handle: ForComboboxOptionHandle<T>): void {
    this.#items.register(handle);
  }
  private unregisterOption(handle: ForComboboxOptionHandle<T>): void {
    this.#items.unregister(handle);
  }

  private registerChip(handle: ForComboboxChipHandle<T>): void {
    this.#chips.register(handle);
  }
  private unregisterChip(handle: ForComboboxChipHandle<T>): void {
    this.#chips.unregister(handle);
  }

  private registerAction(handle: ForComboboxActionHandle): void {
    this.#actions.register(handle);
  }
  private unregisterAction(handle: ForComboboxActionHandle): void {
    this.#actions.unregister(handle);
  }

  moveActionFocus(fromActionId: string | null, direction: 'next' | 'prev'): void {
    const all = this.#actions.items();
    const inputEl = this.input();
    const stops: { key: number; focus: () => void }[] = [];
    if (inputEl) {
      stops.push({ key: -1, focus: () => inputEl.focus() });
    }
    for (let i = 0; i < all.length; i++) {
      const a = all[i]!;
      if (!a.disabled()) {
        stops.push({ key: i, focus: () => a.host.focus() });
      }
    }
    if (stops.length === 0) {
      return;
    }
    let sourceKey: number;
    if (fromActionId === null) {
      sourceKey = -1;
    } else {
      const idx = all.findIndex((a) => a.id() === fromActionId);
      sourceKey = idx === -1 ? -1 : idx;
    }
    const target =
      direction === 'next'
        ? (stops.find((s) => s.key > sourceKey) ?? stops[0]!)
        : ([...stops].reverse().find((s) => s.key < sourceKey) ?? stops[stops.length - 1]!);
    target.focus();
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.compareWith());
  }

  #setSingle(v: T): void {
    if (this.value().length === 1 && this.isSelected(v)) {
      return;
    }
    this.value.set([v]);
  }

  isActive(id: string): boolean {
    return this.#activeId() === id;
  }

  isPointerSuppressed(): boolean {
    return this.#pointerSuppression.isSuppressed();
  }

  activate(handle: ForComboboxOptionHandle<T>): void {
    if (this.effectiveDisabled() || this.readonly() || handle.disabled()) {
      return;
    }
    const v = handle.value();
    if (isUnset(v)) {
      return;
    }
    if (this.multiple()) {
      // Toggle in/out of the array. Stay open so the user can keep picking.
      this.value.set(toggleInArray(this.value(), v, this.compareWith()));
      if (this.commitOnSelect()) {
        // Reset query so the next typed prefix searches afresh.
        this.query.set('');
        this.#syncInputValue('');
      }
      this.#activeId.set(handle.id());
      return;
    }
    // Single mode: replace + close + commit label.
    this.#setSingle(v);
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
    const el = this.#inputSlot.element();
    if (el && el.value !== value) {
      el.value = value;
    }
  }

  removeValue(v: T): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const equals = this.compareWith();
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

    const target = nextEnabledHandle(items, currentIndex, action, { loop: this.loop() });
    if (target === null) {
      return;
    }
    this.#activeId.set(target.id());
    this.#scrollActiveIntoView(target.host);
    this.#lastPositionedId = target.id();
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

  private setActiveId(id: string | null): void {
    this.#activeId.set(id);
    this.#lastPositionedId = id;
  }

  #scrollActiveIntoView(host: HTMLElement): void {
    this.#pointerSuppression.suppress();
    host.scrollIntoView?.({ block: 'nearest' });
  }

  /**
   * Scroll the current activedescendant option into view. Driven from
   * `[forComboboxContent]`'s positioner first-resolved-position hook
   * (`onFirstPosition`) — the only moment both prerequisites hold: the content
   * has been portaled to `document.body` (which resets the scroll container's
   * `scrollTop` to 0, wiping the seed scroll the auto-highlight bridge applied
   * during change detection) and `@floating-ui/dom`'s `size` middleware has
   * constrained the surface to its `max-height` (so it is actually scrollable).
   *
   * Re-applies the scroll unconditionally — the bridge already recorded this id
   * as positioned, but the portal move invalidated the real scroll position, so
   * the usual "already positioned" guard must not short-circuit here. Fires once
   * per open (the positioner hook is per-open, not per-run, so a side flip while
   * open never re-fires it and yanks the user's scroll back), so a later hover
   * never scrolls. No-op while virtualizing: the navigator owns the virtualized
   * scroll and the indexed seed is intentionally passive.
   */
  scrollActiveOptionIntoView(): void {
    if (this.totalCount() !== undefined) {
      return;
    }
    const id = this.#activeId();
    if (id === null) {
      return;
    }
    const active = this.#items.items().find((o) => o.id() === id);
    if (!active) {
      return;
    }
    active.host.scrollIntoView?.({ block: 'nearest' });
    this.#lastPositionedId = id;
  }

  selectedEntries(): readonly { id: string; value: T; label: string; disabled: boolean }[] {
    return this.#labelCache.selectedEntries();
  }

  readonly #completionEntriesMemo = computed<readonly LabelCacheEntry<T>[]>(() => {
    const liveWindow = this.#labelCache.windowEntries();
    if (this.totalCount() === undefined) {
      return liveWindow;
    }
    return mergeOffWindowEntries(
      liveWindow,
      this.#requireNavigator().snapshotByPos(),
      this.itemToFormValue(),
    );
  });

  completionEntries(): readonly { id: string; value: T; label: string; disabled: boolean }[] {
    return this.#completionEntriesMemo();
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

  private setInitialFocus(target: ForComboboxInitialFocus): void {
    this.#initialFocusState.setTarget(target);
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
    this.#initialFocusState.setTarget(initialFocus);
    this.#closeReasonState.reset();
    this.open.set(true);
  }

  closeMenu(reason: ForComboboxCloseReason): void {
    if (!this.open()) {
      return;
    }
    this.#closeReasonState.set(reason);
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

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    const inputEl = this.#inputSlot.element();
    const content = this.#contentSlot.element();
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
