import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  type Signal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  createPointerHighlight,
  injectHiddenInput,
  injectNativeFormResetToInitial,
  LabelCache,
  lookupByValue,
  resolveListNavigation,
  type WritingDirection,
  RangeSelectionEngine,
  defaultCompareWith,
  defaultItemToFormValue,
  isUnset,
  selectionMembership,
  singleSelected,
  toggleInArray,
  injectTextDirection,
  findTypeaheadMatch,
  injectTypeahead,
  type VetoableEvent,
  type VetoableNativeEvent,
  boundEntries,
  type Unset,
} from 'forty-cdk/core';
import { warnIfOpenWithoutContent } from 'forty-cdk/core-overlay';
import { AnchoredFormValueControlBase, ListboxOverlayController } from 'forty-cdk/core-anchored';
import {
  FOR_SELECT_CONTEXT,
  SELECT_TRIGGERS,
  type ForSelectCloseReason,
  type ForSelectContext,
  type ForSelectInitialFocus,
  type ForSelectOptionHandle,
  type ForSelectOverlayFacade,
  type SelectVirtualization,
  type SelectVirtualizationHost,
} from './select-context';
import { FOR_SELECT_DEFAULTS } from 'forty-cdk/defaults';
import type { SelectVirtualizedNavigator } from './select-virtualized-navigator';

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
  extends AnchoredFormValueControlBase
  implements FormValueControl<readonly T[]>, ForSelectContext<T>
{
  readonly #typeahead = injectTypeahead();
  readonly #closedTypeahead = injectTypeahead();
  readonly #defaults = inject(FOR_SELECT_DEFAULTS);
  protected readonly positioningDefaults = this.#defaults;

  /** The `[forSelect]` root element (see `SelectPieceContext.host`). */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

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
  readonly compareWith = input<(a: T, b: T) => boolean>(defaultCompareWith);

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
   * (`[forSelectVirtualized]` with `totalCount` set): range selection needs the full set of enabled options
   * across the range, which is unavailable while the list is partially
   * unmounted. Pressing one of those combinations on a virtualized multi-select
   * listbox throws in dev mode. Toggle options individually with Enter, Space,
   * or click, or drop `totalCount` to use the non-virtualized DOM-focus listbox.
   */
  readonly multiple = input(false, { transform: booleanAttribute });

  /**
   * Presentation mode. When `true`, `[forSelectContent]` mounts as a trapped /
   * inert / scroll-locked modal surface instead of the default anchored popover — the batteries-included touch
   * presentation a consumer opts into with `[modal]="isCoarsePointer()"`. The
   * form-value wiring (`[(value)]`, `name`) is unchanged.
   *
   * Read when the content mounts, so a change takes effect on the next open.
   * Every anchored-positioning input — `position`, `side`, `align`,
   * `sideOffset`, `alignOffset`, `sticky`, `hideWhenDetached`,
   * `clipUntilPositioned`, `avoidCollisions`, `collisionPadding` — is a no-op
   * in this mode. Default `false`. The swipe / snap-point sheet is not this
   * mode — compose a `ForListbox` inside a `ForDrawer` for that.
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
   * Whether arrow navigation wraps past the first / last enabled option. Default `true`.
   * The default is read from `provideForSelectDefaults` for the surrounding
   * scope.
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  /** Axis the arrow keys navigate. Reflected as `data-orientation` on the content. */
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /**
   * Writing direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir` attribute
   * (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]` always wins.
   * The resolved value is reflected to the host `dir` attribute.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Single-mode only. When true, a keyboard focus move (arrow navigation or a
   * typeahead match) also selects the focused option while the listbox is
   * open. APG calls this optional and recommends caution — leave off unless
   * your UX truly benefits. Default `false`.
   * The default is read from `provideForSelectDefaults` for the surrounding
   * scope.
   *
   * Not supported together with virtualization (`[forSelectVirtualized]` with
   * `totalCount` set): the virtualized `aria-activedescendant` path resolves off-window navigation
   * targets asynchronously, so selection cannot follow focus there without
   * deriving the committed value from a render side effect. Keyboard-navigating
   * a virtualized listbox with it set throws in dev mode, from the move the
   * combination degrades.
   */
  readonly selectionFollowsFocus = input(this.#defaults.selectionFollowsFocus, {
    transform: booleanAttribute,
  });

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

  readonly #virtualization = signal<SelectVirtualization<T> | null>(null);

  readonly #virtualized = computed(() => this.#virtualization()?.totalCount() !== undefined);

  /** Full source length while a `[forSelectVirtualized]` virtualizes the select. */
  private readonly totalCount = computed(() => this.#virtualization()?.totalCount());

  readonly #activeId = signal<string | null>(null);

  /** The mode the mounted `[forSelectContent]` published, `null` while none is mounted. */
  readonly #contentModal = signal<Signal<boolean> | null>(null);
  private readonly mountedModal = computed(() => this.#contentModal()?.() ?? this.modal());

  /**
   * Shared overlay-listbox state machine: option collection, trigger / anchor /
   * content registries + ids, DOM-focus navigation, the open / close machine,
   * the initial-focus / close-reason state, and the dismiss / auto-focus emit
   * forwarders. The value-specific behaviour (`isSelected`, `activate`,
   * `focusSelectedOption`, closed-state typeahead, the virtualized activedescendant path,
   * `commitOnTab`'s value set) stays in this root; close-time virtualized
   * cleanup and the post-navigate scroll / `selectionFollowsFocus` move are
   * threaded through the controller's side-effect callbacks.
   */
  readonly #controller = new ListboxOverlayController<
    ForSelectOptionHandle<T>,
    ForSelectInitialFocus,
    ForSelectCloseReason
  >({
    idPrefix: 'for-select',
    triggers: inject(SELECT_TRIGGERS).of(this),
    anchorSlot: { primitive: 'select', owner: '[forSelect]', claimant: '[forSelectAnchor]' },
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
        this.#virtualModel().resume.clear();
        this.#virtualModel().navigator().resetPending();
      }
    },
    onNavigateFocus: (target) => this.#afterKeyboardFocus(target),
    onUnregisterOption: (handle) => {
      if (this.#virtualized() && this.#activeId() === handle.id()) {
        if (this.open()) {
          this.#virtualModel().resume.retain(handle.posInSet(), handle.value());
        }
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

  private readonly tabOut = this.#controller.tabOut('tab', () => !this.#virtualized());

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
    reveal: (host) => {
      host.focus();
      this.#scrollActiveIntoView(host);
    },
  });

  /** The active option's `id` in the virtualized path, `null` in the default path. */
  private readonly activeDescendantId = computed<string | null>(() =>
    this.#virtualized() ? this.#activeId() : null,
  );

  readonly #pointer = createPointerHighlight({
    items: () => this.#controller.options(),
    activeDescendant: {
      active: () => this.#virtualized(),
      claim: (id) => this.#setActiveId(id),
    },
  });

  private readonly pointerHighlightedOption = this.#pointer.pointed;

  /** The virtualized focus model; only reached while {@link #virtualized} holds. */
  #virtualModel(): SelectVirtualization<T> {
    return this.#virtualization()!;
  }

  #setActiveId(id: string | null): void {
    if (id !== null) {
      this.#virtualization()?.resume.clear();
    }
    this.#activeId.set(id);
  }

  private registerVirtualization(virtualization: SelectVirtualization): SelectVirtualizationHost {
    this.#virtualization.set(virtualization as unknown as SelectVirtualization<T>);
    return {
      items: this.#controller.options,
      loop: this.loop,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#setActiveId(id),
      scrollActiveIntoView: (host) => this.#scrollActiveIntoView(host),
    };
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
    compareWith: this.compareWith,
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
    const cached = lookupByValue(
      this.#labelCache.selectedEntries(),
      (entry) => entry.value,
      this.compareWith(),
    );
    const toFormValue = this.itemToFormValue();
    return values.map(
      (v) => cached(v)?.label ?? (typeof v === 'string' ? (v as string) : toFormValue(v)),
    );
  });

  private readonly selectedOptionEl = computed<HTMLElement | null>(() => {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const byValue = lookupByValue(
      boundEntries(this.#controller.options(), (o) => o.value()),
      (entry) => entry.value,
      this.compareWith(),
    );
    for (const v of values) {
      const entry = byValue(v);
      if (entry) {
        return entry.handle.host;
      }
    }
    return null;
  });

  readonly #isSelected = selectionMembership(this.value, this.compareWith);

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
    warnIfOpenWithoutContent({
      primitive: 'select',
      piece: '[forSelectContent]',
      condition: 'select.open()',
      open: this.open,
      content: this.#controller.content,
    });
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });
    injectNativeFormResetToInitial(this.value);

    // @sanctioned-pull(label-cache-window): the option window exists only while
    // the listbox is open, and the closed-state typeahead reading it has no
    // reader during that cycle.
    effect(() => {
      if (this.open()) {
        this.#labelCache.prime();
      }
    });
  }

  isSelected(v: T): boolean {
    return this.#isSelected()(v);
  }

  activate(v: T | Unset): void {
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
    this.#controller.closeOverlay('select');
  }

  private extendByArrow(currentOption: HTMLElement, action: 'next' | 'prev'): void {
    this.#rangeEngine.extendByArrow(currentOption, action);
  }

  private selectRangeToFocused(currentOption: HTMLElement): void {
    this.#rangeEngine.selectRangeToFocused(currentOption);
  }

  selectAll(): void {
    this.#rangeEngine.selectAll();
  }

  private selectFromCurrentToEdge(currentOption: HTMLElement, edge: 'first' | 'last'): void {
    this.#rangeEngine.selectFromCurrentToEdge(currentOption, edge);
  }

  #afterKeyboardFocus(target: ForSelectOptionHandle<T>): void {
    this.#scrollActiveIntoView(target.host);
    if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
      this.#rangeEngine.selectSingle(target.value());
    }
  }

  private handleClosedTypeahead(event: KeyboardEvent): boolean {
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
      (o) => o.disabled,
    );
    if (match) {
      this.#rangeEngine.selectSingle(match.value);
    }
    return true;
  }

  private focusSelectedOption(): boolean {
    const values = this.value();
    if (values.length === 0) {
      return false;
    }
    const byValue = lookupByValue(
      boundEntries(
        this.#controller.options().filter((o) => !o.disabled()),
        (o) => o.value(),
      ),
      (entry) => entry.value,
      this.compareWith(),
    );
    for (const v of values) {
      const entry = byValue(v);
      if (entry) {
        this.#pointer.suppress();
        entry.handle.host.focus();
        return true;
      }
    }
    return false;
  }

  private revealInitialFocus(): void {
    if (this.#virtualized()) {
      return;
    }
    const target = this.#controller.revealTarget(() => this.selectedOptionEl());
    if (target) {
      this.#scrollActiveIntoView(target);
    }
  }

  private highlightFromPointer(host: HTMLElement, id: string): void {
    this.#pointer.claim(host, id);
  }

  private notifyOptionFocus(): void {
    this.#pointer.release();
  }

  private releasePointerHighlight(): void {
    this.#pointer.release();
  }

  private registerContentModal(modal: Signal<boolean>): void {
    this.#contentModal.set(modal);
  }

  private unregisterContentModal(modal: Signal<boolean>): void {
    if (this.#contentModal() === modal) {
      this.#contentModal.set(null);
    }
  }

  /**
   * Scroll an option into view with the pointer-suppression window open, so the
   * synthetic `pointermove` the scroll fires when a different option slides under
   * a stationary cursor cannot hand the highlight to it.
   */
  #scrollActiveIntoView(host: HTMLElement): void {
    this.#pointer.suppress();
    this.#pointer.release();
    host.scrollIntoView?.({ block: 'nearest' });
  }

  private commitOnTab(value: T | Unset): void {
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
    this.#controller.closeOverlay('tab');
  }

  override markTouched(): void {
    super.markTouched();
  }

  private seedVirtualizedInitialFocus(): void {
    if (!this.#virtualized()) {
      return;
    }
    const navigator = this.#virtualModel().navigator();
    const target = this.#controller.initialFocus();
    if (target !== 'selected') {
      navigator.navigate(target);
      return;
    }
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

  private handleVirtualizedKeydown(event: KeyboardEvent): void {
    if (!this.#virtualized() || this.effectiveDisabled()) {
      return;
    }
    if (this.#virtualModel().rejectRangeSelect(event)) {
      return;
    }
    if (event.key === 'Tab') {
      if (this.mountedModal()) {
        return;
      }
      this.#commitActiveDescendantOnTab();
      return;
    }
    if (event.key === ' ' && this.#typeaheadVirtualized(event)) {
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
      this.#virtualModel().navigator().navigate(action);
      return;
    }
    this.#typeaheadVirtualized(event);
  }

  /**
   * Guards the `selectionFollowsFocus` + virtualization invariant at every
   * keyboard move of the virtualized activedescendant — arrow / Home / End /
   * Page navigation and a typeahead match alike, since both move focus without
   * carrying selection. Seeding on open and a click are not
   * covered: neither is a navigation the combination degrades.
   */
  #assertSelectionFollowsFocusSupported(): void {
    if (this.#virtualized()) {
      this.#virtualModel().assertSelectionFollowsFocusSupported();
    }
  }

  private notifyOptionClick(optionId: string): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#setActiveId(optionId);
    this.#controller.content()?.focus();
  }

  #committedIndex(navigator: SelectVirtualizedNavigator<T>): number | null {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const byValue = lookupByValue(
      [...navigator.snapshotByPos()].filter(([, entry]) => !entry.disabled),
      ([, entry]) => entry.value,
      this.compareWith(),
    );
    for (const v of values) {
      const hit = byValue(v);
      if (hit) {
        return hit[0];
      }
    }
    return null;
  }

  #hintedSelectedIndex(): number | null {
    if (this.value().length === 0) {
      return null;
    }
    const idx = this.#virtualModel().selectedIndex();
    const total = this.totalCount();
    if (idx === undefined || total === undefined || idx < 0 || idx >= total) {
      return null;
    }
    return idx;
  }

  #activeTarget(): { readonly value: T | Unset; readonly resumePos: number | null } | null {
    const id = this.#activeId();
    if (id === null) {
      const resumed = this.#virtualModel().resume.resolve();
      return resumed === null || resumed.entry.disabled
        ? null
        : { value: resumed.entry.value, resumePos: resumed.pos };
    }
    const handle = this.#controller.options().find((o) => o.id() === id);
    return !handle || handle.disabled() ? null : { value: handle.value(), resumePos: null };
  }

  #activateActiveDescendant(): void {
    const target = this.#activeTarget();
    if (target === null) {
      return;
    }
    if (target.resumePos !== null) {
      this.#virtualModel().navigator().seedActive(target.resumePos);
    }
    this.activate(target.value);
  }

  #commitActiveDescendantOnTab(): void {
    const target = this.#activeTarget();
    if (target !== null) {
      this.commitOnTab(target.value);
      return;
    }
    this.#controller.focusTrigger();
    this.#controller.closeOverlay('tab');
  }

  /**
   * The virtualized typeahead searches the position snapshot, not the rendered
   * window, so a match the consumer's virtualizer has unmounted is reachable;
   * the match is seeded rather than focused, so an off-window one emits
   * `(scrollToIndex)` and settles once the option mounts.
   */
  #typeaheadVirtualized(event: KeyboardEvent): boolean {
    const navigator = this.#virtualModel().navigator();
    const { handled, pos } = navigator.resolveTypeahead(
      this.#typeahead,
      event,
      (entry) => entry.label,
    );
    if (pos !== null) {
      this.#assertSelectionFollowsFocusSupported();
      navigator.seedActive(pos);
    }
    return handled;
  }
}
