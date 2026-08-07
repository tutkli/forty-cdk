import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  accessibleTextContent,
  type FloatingAlign,
  type FloatingSide,
  FormUiControlBase,
  injectHiddenInput,
  IdGenerator,
  isRangeSelectShortcut,
  LabelCache,
  type LabelCacheEntry,
  resolveListNavigation,
  resolveListTypeahead,
  runVirtualizedNavigatorBridge,
  throwUnsupportedVirtualizedRangeSelect,
  throwUnsupportedVirtualizedSelectionFollowsFocus,
  type WritingDirection,
  ListboxOverlayController,
  RangeSelectionEngine,
  defaultItemToFormValue,
  isInArray,
  isUnset,
  singleSelected,
  toggleInArray,
  injectTextDirection,
  findTypeaheadMatch,
  injectTypeahead,
  type VetoableEvent,
  type VetoableNativeEvent,
} from 'forty-cdk/core';
import {
  FOR_SELECT_CONTEXT,
  type ForSelectCloseReason,
  type ForSelectContext,
  type ForSelectInitialFocus,
  type ForSelectOptionHandle,
  type ForSelectOverlayFacade,
} from './select-context';
import { FOR_SELECT_DEFAULTS } from './select-defaults';
import { SelectVirtualizedNavigator } from './select-virtualized-navigator';

/**
 * Headless implementation of the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).
 * Implements `FormValueControl<readonly T[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Generic over the option value type `T` (default `string`). When the
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * `[forSelectOption][value]`; object identity is resolved by the
 * consumer-supplied `[compareWith]` and the hidden inputs serialize
 * via `[itemToFormValue]`. Option display text is read from the rendered
 * `textContent`, so no separate label function is needed — supply the
 * optional `[itemToLabel]` only when a pre-set object value must render its
 * label before the listbox is ever opened (the documented `@if (open())`
 * pattern).
 *
 * Selection is always modeled as `readonly T[]`:
 * - In single mode (`multiple=false`, default), the array has 0 or 1 element
 *   and option activation closes the listbox.
 * - In multi mode, option activation toggles and the listbox stays open.
 *
 * Typeahead has two modes mirroring native `<select>`:
 * - **Closed trigger** (single mode only): printable keys select the matching
 *   option immediately without opening the listbox.
 * - **Open listbox**: printable keys move focus to the first matching option
 *   (selection still requires Enter / Space / click).
 */
@Directive({
  selector: '[forSelect]',
  exportAs: 'forSelect',
  host: {
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
  },
  providers: [{ provide: FOR_SELECT_CONTEXT, useExisting: ForSelect }],
})
export class ForSelect<T = string>
  extends FormUiControlBase
  implements FormValueControl<readonly T[]>, ForSelectContext<T>
{
  readonly #idGen = inject(IdGenerator);
  readonly #typeahead = injectTypeahead();
  readonly #closedTypeahead = injectTypeahead();
  readonly #defaults = inject(FOR_SELECT_DEFAULTS);

  /** The `[forSelect]` root element (see {@link ForSelectContext.host}). */
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /**
   * Two-way bindable. Selected option values. Single-mode keeps 0 or 1
   * element. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes, never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly T[]>([]);

  /**
   * Compare two items for equality. Defaults to `===`, which is the
   * correct identity for primitive `T` (e.g. strings, numbers). Override
   * when binding object items so the directive can locate selected entries
   * by id (or any other stable key) instead of by reference:
   * `[compareWith]="(a, b) => a.id === b.id"`.
   */
  readonly compareWith = input<(a: T, b: T) => boolean>((a, b) => a === b);

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
   * Resolve the display label for an item without the listbox mounted.
   * When set, {@link selectedLabels} (and therefore `[forSelectValue]`)
   * renders this for any selected value, so a pre-set object value shows
   * its label on first paint — before the listbox has ever been opened, in
   * the documented `@if (forSelect.open())` pattern. Without it, object-value
   * labels resolve from the rendered option `textContent`, which is only
   * available once the content mounts; the serialized form value is shown as
   * a last-resort fallback in the meantime: `[itemToLabel]="(c) => c.name"`.
   *
   * Defaults to `undefined` (string mode renders the value verbatim, so no
   * label function is needed).
   */
  readonly itemToLabel = input<((item: T) => string) | undefined>(undefined);

  /**
   * Read-only single-select convenience view of {@link value}. Returns the
   * sole value when exactly one is selected (regardless of `multiple`),
   * otherwise `null` (zero, or 2+ selected). Lets single-select consumers
   * read `selected()` instead of unwrapping `value()[0]`. The array-backed
   * `value` model remains the source of truth and the `FormValueControl`
   * contract; this is a derived accessor.
   */
  readonly selected = singleSelected(this.value);

  /**
   * Two-way bindable. Whether the listbox is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger toggle, Escape, outside dismissal, single-mode option select),
   * never on consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  /**
   * When true, multiple options can be selected and option activation toggles
   * without closing the listbox. Single mode (default) keeps the value array at
   * 0 or 1 element and closes on select.
   *
   * In the default (non-virtualized) path the full APG range keyboard
   * (Shift+Arrow, Shift+Space, Ctrl/Cmd+A, Ctrl+Shift+Home/End) extends the
   * selection, matching `ForListbox`.
   *
   * That range keyboard is not supported together with virtualization
   * (`totalCount` set): range selection needs the full set of enabled options
   * across the range, which is unavailable while the list is partially
   * unmounted. Pressing one of those combinations on a virtualized multi-select
   * listbox throws in dev mode. Toggle options individually with Enter, Space,
   * or click, or drop `totalCount` to use the non-virtualized DOM-focus listbox.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Presentation mode. When `true`, `[forSelectContent]` mounts as a trapped /
   * inert / scroll-locked modal surface (routed through `_internal/modal-shell`)
   * instead of the default anchored popover — the batteries-included touch
   * presentation a consumer opts into with `[modal]="isCoarsePointer()"`. The
   * form-value wiring (`[(value)]`, `name`) is unchanged.
   *
   * Read once when the content mounts (the two shells are structurally
   * different; switching at runtime would need a remount, and the surface
   * mounts lazily via `@if (open())` well after `modal` settles). Every
   * anchored-positioning input — `position`, `side`, `align`, `sideOffset`,
   * `alignOffset`, `sticky`, `hideWhenDetached`, `clipUntilPositioned`, `avoidCollisions`,
   * `collisionPadding`, `arrowPadding` — is a no-op in this mode. Default
   * `false` (non-breaking). The swipe / snap-point sheet is deliberately not
   * this mode — compose a `ForListbox` inside a `ForDrawer` for that.
   */
  readonly modal = input(false, { transform: booleanAttribute });

  /**
   * Positioning algorithm.
   *
   * - `'popper'` (default): standard floating-ui anchored placement using
   *   `side` / `align` / `sideOffset` / `alignOffset`, with `flip` + `shift`
   *   collision handling. Same path as Popover / DropdownMenu.
   * - `'item-aligned'`: the listbox overlays the trigger so the selected
   *   option's vertical center aligns with the trigger's vertical center
   *   — visually the menu "snaps over" the trigger when opened, mirroring
   *   macOS native `<select>`. Falls back to the first enabled option when
   *   nothing is selected. `side`, `align`, `sideOffset`, `alignOffset`,
   *   `sticky`, `hideWhenDetached`, `clipUntilPositioned`, and `avoidCollisions` are ignored in
   *   this mode; only `collisionPadding` is honored.
   */
  readonly position = input<'popper' | 'item-aligned'>('popper');

  /**
   * Side the listbox is anchored to. Defaults to `'bottom'`. Pair with
   * `align` for the full positioning API. Ignored when
   * `position="item-aligned"`.
   */
  readonly side = input<FloatingSide | undefined>('bottom');

  /** Alignment along the chosen `side`. Defaults to `'start'`. */
  readonly align = input<FloatingAlign | undefined>('start');

  /**
   * Gap (px) between trigger and listbox along the main axis. Default `4`.
   * The default is read from
   * `provideForSelectDefaults` for the surrounding scope.
   */
  readonly sideOffset = input(this.#defaults.sideOffset, { transform: numberAttribute });

  /** Gap (px) along the cross axis. Default `0`. */
  readonly alignOffset = input(0, { transform: numberAttribute });

  /** When `true` (default), `flip` and `shift` keep the listbox inside the viewport. */
  readonly avoidCollisions = input(true, { transform: booleanAttribute });

  /**
   * Padding (px) applied uniformly to flip / shift / size. Default `8`.
   * The default is read from `provideForSelectDefaults` for the surrounding
   * scope.
   */
  readonly collisionPadding = input(this.#defaults.collisionPadding, {
    transform: numberAttribute,
  });

  /** Padding (px) for the `arrow` middleware. Default `0`. */
  readonly arrowPadding = input(0, { transform: numberAttribute });

  /** Stickiness behaviour for `shift`. Default `'partial'`. */
  readonly sticky = input<'partial' | 'always' | false>('partial');

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  /**
   * When `true` (default), the content is clipped until floating-ui resolves
   * its first position, preventing a flash at the viewport corner. Set to
   * `false` so a dramatic `animate.enter` plays from its first frame (the
   * surface may flash briefly at the unresolved position while positioning
   * computes).
   */
  readonly clipUntilPositioned = input(true, { transform: booleanAttribute });

  /** Whether arrow navigation wraps past the first / last enabled option. */
  readonly loop = input(true, { transform: booleanAttribute });

  /** Axis the arrow keys navigate. Reflected as `data-orientation` on the content. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * Total number of items in the source data. When set, switches the listbox
   * to the virtualized `aria-activedescendant` focus model and populates
   * `aria-setsize` on each rendered option. Leave unset (default) for the
   * standard DOM-focus model.
   */
  readonly totalCount = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });
  /**
   * Inclusive-exclusive `[start, end)` index range of the currently rendered options, as provided
   * by `injectVirtualizer`. Decides whether a navigation target is inside the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);

  /**
   * Virtualized-only open-time reveal hint: the absolute index of the currently
   * committed option within the full source dataset. Consulted on open by the
   * scroll-to-selected algorithm as the authoritative index when the committed
   * value's option lies outside the rendered window and has never been rendered
   * (so its position is absent from the navigator snapshot). Bind it from the
   * consumer's own value→index lookup.
   *
   * This is a reveal hint, **not** a selection source — `value` / `[(value)]`
   * stay authoritative; it only decides which option is scrolled into view on
   * open. It is singular: in multiple mode it seeds the first committed option.
   * Leave unset (default) for a non-virtualized select, or when the committed
   * option is always inside the initial window. An off-window committed value
   * with no `[selectedIndex]` that was never rendered falls back to focusing the
   * first enabled option; an out-of-range index (or an empty selection) is
   * silently ignored.
   */
  readonly selectedIndex = input<number | undefined>(undefined);

  /**
   * Optional virtualized-only seam that tells the directive the source dataset
   * changed **without** a `totalCount` transition — a same-length re-sort or
   * refresh (e.g. sorting a 1000-row list). Bind any value that changes on such
   * a refresh (a version counter, the array reference, a sort-key string); when
   * it changes the position snapshot rebuilds from empty so navigation never
   * resolves against a stale off-window entry. Leave unset (default) when the
   * dataset only ever changes length. Equivalent to calling
   * {@link ForSelect.invalidateSnapshot} imperatively.
   */
  readonly dataVersion = input<unknown>();
  /**
   * Emitted when navigation reaches an option outside the rendered window, or
   * on open-time scroll-to-selected when the committed option's absolute index
   * is resolvable — it is in the rendered window, was previously rendered (in
   * the snapshot), or was supplied via `[selectedIndex]`. Pass to
   * `injectVirtualizer`'s `scrollToIndex` so the correct option mounts.
   */
  readonly scrollToIndex = output<number>();

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Single-mode only. When true, arrow nav also selects the focused option
   * while the listbox is open. APG calls this optional and recommends
   * caution — leave off unless your UX truly benefits. Default `false`.
   *
   * Not supported together with virtualization (`totalCount` set): the
   * virtualized `aria-activedescendant` path resolves off-window navigation
   * targets asynchronously, so selection cannot follow focus there without
   * deriving the committed value from a render side effect. Keyboard-navigating
   * a virtualized listbox with it set throws in dev mode, from the move the
   * combination degrades.
   */
  readonly selectionFollowsFocus = input(false, { transform: booleanAttribute });

  /** Placeholder shown by `[forSelectValue]` when no option is selected. */
  readonly placeholder = input<string>('');

  /** When true (default), Escape, pointer-down outside, and focus outside close the listbox. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** When true (default), focus returns to the trigger on close. */
  readonly returnFocus = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forSelectContent]` when the trigger isn't a meaningful name. */
  readonly ariaLabel = input<string | null>(null);

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
   * Fires just before the listbox sends focus to the selected option
   * (or first / last enabled) on mount. Call `preventDefault()` on the
   * emitted veto to skip the imperative focus move.
   */
  readonly autoFocusOnOpen = output<VetoableEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount. Call
   * `preventDefault()` on the veto to suppress the return-focus.
   */
  readonly autoFocusOnClose = output<VetoableEvent>();

  readonly #virtualized = computed(() => this.totalCount() !== undefined);
  readonly #activeId = signal<string | null>(null);

  /**
   * Shared overlay-listbox state machine: option collection, trigger / anchor /
   * content registries + ids, DOM-focus navigation, the open / close machine,
   * the initial-focus / close-reason state, and the dismiss / auto-focus emit
   * forwarders. The value-specific behaviour (`isSelected`, `activate`,
   * `focusSelectedOption`, typeahead, the virtualized activedescendant path,
   * `commitOnTab`'s value set) stays in this root; close-time virtualized
   * cleanup and the post-navigate scroll / `selectionFollowsFocus` move are
   * threaded through the controller's side-effect callbacks.
   */
  readonly #controller = new ListboxOverlayController<
    ForSelectOptionHandle<T>,
    ForSelectInitialFocus,
    ForSelectCloseReason
  >(this.#idGen, {
    idPrefix: 'for-select',
    multipleAnchorsError:
      '[forty-cdk/select] Multiple [forSelectAnchor] inside the same [forSelect]; only one is allowed.',
    defaultInitialFocus: 'selected',
    effectiveDisabled: this.effectiveDisabled,
    setOpen: (open) => this.open.set(open),
    isOpen: () => this.open(),
    emit: {
      escapeKeyDown: this.escapeKeyDown,
      pointerDownOutside: this.pointerDownOutside,
      focusOutside: this.focusOutside,
      interactOutside: this.interactOutside,
      autoFocusOnOpen: this.autoFocusOnOpen,
      autoFocusOnClose: this.autoFocusOnClose,
    },
    loop: this.loop,
    dismissible: this.dismissible,
    escapeReason: 'escape',
    programmaticReason: 'programmatic',
    markTouched: () => this.markTouched(),
    onClose: () => {
      if (this.#virtualized()) {
        this.#activeId.set(null);
        this.#navigator?.resetPending();
      }
    },
    onNavigateFocus: (target) => {
      target.host.scrollIntoView?.({ block: 'nearest' });
      if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
        this.#rangeEngine.selectSingle(target.value());
      }
    },
    onUnregisterOption: (handle) => {
      if (this.#virtualized() && this.#activeId() === handle.id()) {
        this.#activeId.set(null);
      }
    },
  });

  /**
   * The shared overlay-listbox coordination surface: trigger / anchor / content registration and
   * ids, DOM-focus navigation, the open / close machine, and the dismiss and auto-focus forwarders.
   *
   * Positioning prefers a registered `[forSelectAnchor]`, reached via `overlay.anchor`, and falls
   * back to the trigger.
   */
  readonly overlay: ForSelectOverlayFacade = this.#controller;

  /**
   * Shared APG range-selection state machine: owns the range anchor and the
   * Shift+Arrow / Shift+Space / Ctrl+A / Ctrl+Shift+Home/End actions plus the
   * single-mode idempotent select guard. The value-specific `activate` (which
   * also closes the listbox in single mode) and the virtualized activedescendant
   * path stay in this root; the range methods one-line delegate here.
   */
  readonly #rangeEngine = new RangeSelectionEngine<T, ForSelectOptionHandle<T>>({
    options: this.#controller.options,
    value: this.value,
    setValue: (v) => this.value.set(v),
    compareWith: this.compareWith,
    multiple: this.multiple,
    effectiveDisabled: this.effectiveDisabled,
    readonly: this.readonly,
  });

  /** The active option's `id` in the virtualized path, `null` in the default path. */
  readonly activeDescendantId = computed<string | null>(() =>
    this.#virtualized() ? this.#activeId() : null,
  );

  #navigator: SelectVirtualizedNavigator<T> | null = null;
  #requireNavigator(): SelectVirtualizedNavigator<T> {
    return (this.#navigator ??= new SelectVirtualizedNavigator<T>({
      items: this.#controller.options,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      loop: this.loop,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#activeId.set(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
      dataVersion: this.dataVersion,
    }));
  }

  /**
   * Force the virtualized position snapshot to rebuild from empty on the next
   * fold, discarding stale off-window entries. Call after a same-length dataset
   * refresh (a re-sort / reload that keeps `totalCount` unchanged) when you
   * cannot express the change through the reactive `[dataVersion]` input. No-op
   * when the select is not virtualized (`totalCount` unset).
   */
  invalidateSnapshot(): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#requireNavigator().invalidateSnapshot();
  }

  /**
   * Bounded option-label cache. The live `options` registry is empty whenever
   * `[forSelectContent]` is unmounted, so {@link selectedLabels} reads the selection-keyed
   * projection and {@link handleClosedTypeahead} the last-window one.
   *
   * Because the window store is replaced rather than merged, a removal performed while the listbox
   * is **closed** cannot refresh it, so closed-state typeahead can still commit a value that no
   * longer exists until the next open. When virtualizing, the window is the rendered slice, so a
   * closed-state match is scoped to it. Selected labels are unaffected — they live in the
   * selection-keyed projection for as long as the value stays selected.
   */
  readonly #labelCache = new LabelCache<T>({
    items: this.#controller.options,
    value: this.value,
    itemToFormValue: this.itemToFormValue,
  });

  /**
   * Trimmed display labels of the selected values, in selection order. Pure
   * derivation: when `[itemToLabel]` is supplied it is authoritative; otherwise
   * resolve from the selection-keyed label cache, then the serialized form value
   * so non-string items still render meaningfully on a cold cache.
   *
   * The cache's labels come from each option's reactive `label` signal,
   * which reads the rendered `textContent`. `textContent` is not a signal, so a
   * label whose rendered text changes without a value change does not self-heal
   * here — supply `[itemToLabel]` for a pure signal derivation that observes
   * label changes directly.
   */
  readonly selectedLabels = computed<readonly string[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    // When `[itemToLabel]` is supplied it is authoritative: the label resolves
    // without the listbox mounted, so a pre-set object value renders correctly
    // on first paint in the documented `@if (open())` pattern and never flickers
    // from a serialized id to the real label once the listbox is first opened.
    const itemToLabel = this.itemToLabel();
    if (itemToLabel) {
      return values.map(itemToLabel);
    }
    const cached = this.#labelCache.selectedEntries();
    const toFormValue = this.itemToFormValue();
    const cachedByKey = new Map<string, LabelCacheEntry<T>>();
    for (const o of cached) {
      cachedByKey.set(toFormValue(o.value), o);
    }
    const labels: string[] = [];
    for (const v of values) {
      const key = toFormValue(v);
      const opt = cachedByKey.get(key);
      labels.push(opt ? opt.label : typeof v === 'string' ? (v as string) : key);
    }
    return labels;
  });

  readonly selectedOptionEl = computed<HTMLElement | null>(() => {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const items = this.#controller.options();
    const toFormValue = this.itemToFormValue();
    const byKey = new Map<string, ForSelectOptionHandle<T>>();
    for (const o of items) {
      byKey.set(toFormValue(o.value()), o);
    }
    for (const v of values) {
      const opt = byKey.get(toFormValue(v));
      if (opt) {
        return opt.host;
      }
    }
    return null;
  });

  protected override fieldLabelledElement(): HTMLElement | null {
    return this.#controller.trigger();
  }

  protected override fieldLabelledElementId(): string {
    return this.#controller.triggerId();
  }

  /**
   * Move focus to the trigger, implementing `FormValueControl.focus` from
   * `@angular/forms/signals`. Without this override Signal Forms would focus the
   * host `[forSelect]` wrapper — which carries no focusable role — so
   * focus-on-error would silently go nowhere. No-op when disabled or before the
   * trigger has registered.
   */
  override focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#controller.trigger()?.focus(options);
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
    // the listbox is open, and the closed-state typeahead reading it has no
    // reader during that cycle.
    effect(() => {
      if (this.open()) {
        this.#labelCache.prime();
      }
    });

    // @sanctioned-pull(navigator-position-map): the rendered window is transient,
    // so a window nothing reads during is lost to the lazy fold.
    effect(() => {
      runVirtualizedNavigatorBridge({
        items: this.#controller.options,
        virtualized: this.#virtualized,
        requireNavigator: () => this.#requireNavigator(),
      });
    });
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.compareWith());
  }

  activate(v: T): void {
    if (this.effectiveDisabled() || this.readonly() || isUnset(v)) {
      return;
    }
    if (this.multiple()) {
      this.value.set(toggleInArray(this.value(), v, this.compareWith()));
      this.#rangeEngine.setAnchor(v);
      return;
    }
    this.#rangeEngine.selectSingle(v);
    this.#rangeEngine.setAnchor(v);
    this.#controller.closeMenu('select');
  }

  extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    this.#rangeEngine.extendByArrow(currentOption, action);
  }

  selectRangeToFocused(currentOption: HTMLElement): void {
    this.#rangeEngine.selectRangeToFocused(currentOption);
  }

  selectAll(): void {
    this.#rangeEngine.selectAll();
  }

  selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    this.#rangeEngine.selectFromCurrentToEdge(currentOption, edge);
  }

  handleTypeahead(event: KeyboardEvent): void {
    const options = this.#controller.options();
    const { match } = resolveListTypeahead(this.#typeahead, event, {
      items: options,
      anchorIndex: options.findIndex((o) => o.host === event.target),
      getText: (o) => accessibleTextContent(o.host),
      isDisabled: (o) => o.disabled(),
    });
    match?.host.focus();
  }

  handleClosedTypeahead(event: KeyboardEvent): boolean {
    // Only single-mode replicates native <select>'s "type-to-select" behavior.
    // Multi-select is ambiguous (which one wins?) — caller falls back to opening.
    if (this.multiple() || this.effectiveDisabled() || this.readonly()) {
      return false;
    }
    if (!this.#closedTypeahead.handle(event)) {
      return false;
    }
    const cached = this.#labelCache.windowEntries();
    const selected = this.selected();
    const equals = this.compareWith();
    const anchorIndex = selected === null ? -1 : cached.findIndex((o) => equals(o.value, selected));
    const match = findTypeaheadMatch(
      cached,
      {
        buffer: this.#closedTypeahead.buffer(),
        repeated: this.#closedTypeahead.isRepeatedChar(),
        anchorIndex,
      },
      (o) => o.label,
      () => false,
    );
    if (match) {
      this.value.set([match.value]);
    }
    return true;
  }

  focusSelectedOption(): boolean {
    const values = this.value();
    if (values.length === 0) {
      return false;
    }
    const equals = this.compareWith();
    const items = this.#controller.options();
    for (const v of values) {
      const opt = items.find((o) => equals(o.value(), v) && !o.disabled());
      if (opt) {
        opt.host.focus();
        return true;
      }
    }
    return false;
  }

  scrollSelectedOptionIntoView(): void {
    if (this.totalCount() !== undefined) {
      return;
    }
    this.selectedOptionEl()?.scrollIntoView?.({ block: 'nearest' });
  }

  commitOnTab(value: T): void {
    if (this.effectiveDisabled() || isUnset(value)) {
      return;
    }
    if (!this.multiple() && !this.readonly()) {
      this.#rangeEngine.selectSingle(value);
    }
    // Move focus to the trigger BEFORE the unmount + close so the browser's
    // Tab default action has a stable active element to advance from. The
    // content's `DestroyRef` reads `lastCloseReason() === 'tab'` and skips
    // its own re-focus — otherwise it would steal focus back from wherever
    // the browser advanced it.
    this.#controller.focusTrigger();
    this.#controller.closeMenu('tab');
  }

  override markTouched(): void {
    super.markTouched();
  }

  seedVirtualizedInitialFocus(): void {
    if (!this.#virtualized()) {
      return;
    }
    const navigator = this.#requireNavigator();
    const committed = this.#committedIndex(navigator);
    if (committed !== null) {
      navigator.seedActive(committed);
      return;
    }
    const hinted = this.#hintedSelectedIndex();
    if (hinted !== null) {
      navigator.seedActive(hinted);
      return;
    }
    navigator.navigate('first');
  }

  handleVirtualizedKeydown(event: KeyboardEvent): void {
    if (!this.#virtualized() || this.effectiveDisabled()) {
      return;
    }
    if (
      this.multiple() &&
      isRangeSelectShortcut(event, { orientation: this.orientation(), dir: this.dir() })
    ) {
      event.preventDefault();
      throwUnsupportedVirtualizedRangeSelect({ primitive: 'select', focusModel: 'DOM-focus' });
      return;
    }
    if (event.key === 'Tab') {
      if (this.modal()) {
        return;
      }
      this.#commitActiveDescendantOnTab();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#activateActiveDescendant();
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.orientation(),
      dir: this.dir(),
      pageKeys: true,
    });
    if (action) {
      event.preventDefault();
      this.#assertSelectionFollowsFocusSupported();
      this.#requireNavigator().navigate(action);
      return;
    }
    this.#typeaheadVirtualized(event);
  }

  /**
   * Guards the `selectionFollowsFocus` + virtualization invariant at every
   * keyboard move of the virtualized activedescendant — arrow / Home / End /
   * Page navigation and a typeahead match alike, since both move focus without
   * carrying selection. Seeding on open and a click are deliberately not
   * covered: neither is a navigation the combination degrades.
   */
  #assertSelectionFollowsFocusSupported(): void {
    if (this.#virtualized() && this.selectionFollowsFocus()) {
      throwUnsupportedVirtualizedSelectionFollowsFocus({
        primitive: 'select',
        focusModel: 'DOM-focus',
        collection: 'listbox',
      });
    }
  }

  notifyOptionClick(optionId: string): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#activeId.set(optionId);
    this.#controller.content()?.focus();
  }

  #committedIndex(navigator: SelectVirtualizedNavigator<T>): number | null {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const equals = this.compareWith();
    const snapshot = navigator.snapshotByPos();
    for (const v of values) {
      for (const [pos, entry] of snapshot) {
        if (!entry.disabled && equals(entry.value, v)) {
          return pos;
        }
      }
    }
    return null;
  }

  #hintedSelectedIndex(): number | null {
    if (this.value().length === 0) {
      return null;
    }
    const idx = this.selectedIndex();
    const total = this.totalCount();
    if (idx === undefined || total === undefined || idx < 0 || idx >= total) {
      return null;
    }
    return idx;
  }

  #activateActiveDescendant(): void {
    const id = this.#activeId();
    if (id === null) {
      return;
    }
    const handle = this.#controller.options().find((o) => o.id() === id);
    if (!handle || handle.disabled()) {
      return;
    }
    this.activate(handle.value());
  }

  #commitActiveDescendantOnTab(): void {
    const id = this.#activeId();
    const handle = id === null ? undefined : this.#controller.options().find((o) => o.id() === id);
    if (handle && !handle.disabled()) {
      this.commitOnTab(handle.value());
      return;
    }
    this.#controller.closeMenu('tab');
  }

  #typeaheadVirtualized(event: KeyboardEvent): void {
    const options = this.#controller.options();
    const activeId = this.#activeId();
    const { match } = resolveListTypeahead(this.#typeahead, event, {
      items: options,
      anchorIndex: activeId === null ? -1 : options.findIndex((o) => o.id() === activeId),
      getText: (o) => accessibleTextContent(o.host),
      isDisabled: (o) => o.disabled(),
    });
    if (match) {
      this.#assertSelectionFollowsFocusSupported();
      this.#activeId.set(match.id());
      match.host.scrollIntoView?.({ block: 'nearest' });
    }
  }
}
