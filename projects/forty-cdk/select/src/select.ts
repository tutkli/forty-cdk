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
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  type FloatingAlign,
  type FloatingSide,
  FormUiControlBase,
  injectHiddenInput,
  IdGenerator,
  type ListNavigationAction,
  resolveListNavigation,
  type WritingDirection,
  ListboxOverlayController,
  defaultItemToFormValue,
  isInArray,
  singleSelected,
  toggleInArray,
  isRequiredInputUnset,
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
} from './select-context';
import { FOR_SELECT_DEFAULTS } from './select-defaults';
import { SelectVirtualizedNavigator } from './select-virtualized-navigator';

/** Sentinel for an option handle whose `input.required` `[value]` is not yet written. */
const NO_VALUE = Symbol('forty-cdk/select:no-value');

/**
 * Headless implementation of the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).
 * Implements `FormValueControl<readonly T[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Generic over the option value type `T` (default `string`). When the
 * consumer binds object items the directive infers `T` from `[(value)]` and
 * `[forSelectOption][value]`; object identity is resolved by the
 * consumer-supplied `[isItemEqualToValue]` and the hidden inputs serialize
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
   * `[isItemEqualToValue]="(a, b) => a.id === b.id"`.
   */
  readonly isItemEqualToValue = input<(a: T, b: T) => boolean>((a, b) => a === b);

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

  readonly loop = input(true, { transform: booleanAttribute });
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
   * Inclusive-exclusive `[start, end)` index range of the currently rendered
   * options, provided by `injectVirtualizer`. Used to decide whether a
   * navigation target is in the visible window.
   */
  readonly visibleRange = input<readonly [number, number] | undefined>(undefined);
  /**
   * Emitted when navigation (or open-time scroll-to-selected) reaches an
   * option outside the rendered window. Pass to `injectVirtualizer`'s
   * `scrollToIndex` so the correct option mounts.
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

  readonly escapeKeyDown = output<VetoableNativeEvent<KeyboardEvent>>();
  readonly pointerDownOutside = output<VetoableNativeEvent<PointerEvent>>();
  readonly focusOutside = output<VetoableNativeEvent<FocusEvent>>();
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
        this.#setSingle(target.value());
      }
    },
    onUnregisterOption: (handle) => {
      if (this.#virtualized() && this.#activeId() === handle.id()) {
        this.#activeId.set(null);
      }
    },
  });

  readonly triggerId = this.#controller.triggerId;
  readonly contentId = this.#controller.contentId;
  readonly initialFocus = this.#controller.initialFocus;
  readonly lastCloseReason = this.#controller.lastCloseReason;
  readonly trigger = this.#controller.trigger;

  /**
   * Element floating-ui anchors the listbox against. Prefers an optional
   * `[forSelectAnchor]` when registered, otherwise falls back to the trigger
   * so existing selects without an anchor keep their behavior. Decoupled from
   * `trigger` so the trigger keeps driving `aria-controls`, the click toggle,
   * focus return, and its dismissal exemption regardless of where the listbox
   * paints.
   */
  readonly anchor = this.#controller.anchor;

  readonly content = this.#controller.content;

  readonly options = this.#controller.options;

  /** The active option's `id` in the virtualized path, `null` in the default path. */
  readonly activeDescendantId = computed<string | null>(() =>
    this.#virtualized() ? this.#activeId() : null,
  );

  #navigator: SelectVirtualizedNavigator<T> | null = null;
  #requireNavigator(): SelectVirtualizedNavigator<T> {
    return (this.#navigator ??= new SelectVirtualizedNavigator<T>({
      items: this.options,
      totalCount: this.totalCount,
      visibleRange: this.visibleRange,
      loop: this.loop,
      getActiveId: () => this.#activeId(),
      setActiveId: (id) => this.#activeId.set(id),
      emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
    }));
  }

  /**
   * Persisted snapshot of the registered options as `{ value, label }` tuples,
   * keyed internally by serialized form value. Drives closed-state typeahead
   * and `[forSelectValue]` label rendering — the live `options` registry is
   * empty whenever `[forSelectContent]` is unmounted, so the snapshot carries
   * the last non-empty option set across close → re-open cycles.
   *
   * A `linkedSignal` that folds the live option set on every `options()`
   * change. When the listbox unmounts (`items().length === 0`) it returns the
   * previous accumulator unchanged so labels stay resolvable while closed. When
   * mounted, the fold is virtualization-aware: the non-virtualized path renders
   * the full option set, so the snapshot is rebuilt from the live options alone
   * — an option the consumer removed is purged rather than lingering forever, so
   * closed typeahead can only select an option that still exists. The
   * virtualized path renders one window at a time, so it carries the previous
   * accumulator forward and merges the window in, keeping off-window labels
   * resolvable. Each option's `label` is itself a `Signal<string>`, so this
   * never reads `textContent` from inside the fold — the canonical replacement
   * for the previous `afterEveryRender(() => signal.set(...))` snapshot (no
   * state-propagation inside an `effect`). A statically-rendered option that
   * registers before its `[value]` binding is written is skipped this fold and
   * folded in on the re-run the binding triggers (see {@link #readHandleValue}).
   */
  readonly #cachedOptions = linkedSignal<
    readonly ForSelectOptionHandle<T>[],
    readonly { value: T; label: string }[]
  >({
    source: () => this.options(),
    computation: (items, prev) => {
      if (items.length === 0) {
        return prev?.value ?? [];
      }
      const toFormValue = this.itemToFormValue();
      const merged = new Map<string, { value: T; label: string }>();
      if (this.#virtualized()) {
        for (const entry of prev?.value ?? []) {
          merged.set(toFormValue(entry.value), entry);
        }
      }
      for (const item of items) {
        const value = this.#readHandleValue(item);
        if (value === NO_VALUE) {
          continue;
        }
        merged.set(toFormValue(value), { value, label: item.label() });
      }
      return [...merged.values()];
    },
  });

  /**
   * Trimmed display labels of the selected values, in selection order. Pure
   * derivation: when `[itemToLabel]` is supplied it is authoritative; otherwise
   * resolve from the persisted option snapshot, then the serialized form value
   * so non-string items still render meaningfully on a cold cache.
   *
   * The snapshot's labels come from each option's reactive `label` signal,
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
    const cached = this.#cachedOptions();
    const toFormValue = this.itemToFormValue();
    const cachedByKey = new Map<string, { value: T; label: string }>();
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
    const items = this.options();
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
    return this.trigger();
  }

  protected override fieldLabelledElementId(): string {
    return this.triggerId();
  }

  /**
   * Read an option handle's `value()` inside the snapshot fold, tolerating the
   * NG0950 thrown while a statically-rendered option is between registering
   * (its constructor, during the content view's creation pass) and having its
   * `input.required` `[value]` binding written (that view's update pass). The
   * fold's prime read can run in that gap, so a static option above a `@for`
   * list would otherwise hard-crash on open. Returns {@link NO_VALUE} in that
   * window; the fold skips the option and folds it in on the re-run the binding
   * triggers (the required-input producer is accessed before the read throws,
   * so the dependency is still tracked). Any non-NG0950 error propagates.
   */
  #readHandleValue(item: ForSelectOptionHandle<T>): T | typeof NO_VALUE {
    try {
      return item.value();
    } catch (error) {
      if (isRequiredInputUnset(error)) {
        return NO_VALUE;
      }
      throw error;
    }
  }

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });

    // Prime the snapshot fold while the listbox is open so its `linkedSignal`
    // `prev` slot is seeded with the live options before they unmount — closed-
    // state typeahead and `[forSelectValue]` then resolve labels even when no
    // `[forSelectValue]` pulls the cache during the open cycle. A read, not a
    // write: this is a legitimate side effect (forcing the lazy fold to run),
    // not state propagation inside an `effect`.
    effect(() => {
      if (this.open()) {
        this.#cachedOptions();
      }
    });

    effect(() => {
      this.options();
      if (!this.#virtualized()) {
        return;
      }
      const navigator = this.#requireNavigator();
      navigator.prime();
      navigator.tryResolvePending();
    });
  }

  setInitialFocus(target: ForSelectInitialFocus): void {
    this.#controller.setInitialFocus(target);
  }

  registerTrigger(el: HTMLElement): void {
    this.#controller.registerTrigger(el);
  }
  unregisterTrigger(el: HTMLElement): void {
    this.#controller.unregisterTrigger(el);
  }

  registerAnchor(el: HTMLElement): void {
    this.#controller.registerAnchor(el);
  }
  unregisterAnchor(el: HTMLElement): void {
    this.#controller.unregisterAnchor(el);
  }

  registerContent(el: HTMLElement): void {
    this.#controller.registerContent(el);
  }
  unregisterContent(el: HTMLElement): void {
    this.#controller.unregisterContent(el);
  }

  registerOption(handle: ForSelectOptionHandle<T>): void {
    this.#controller.registerOption(handle);
  }
  unregisterOption(handle: ForSelectOptionHandle<T>): void {
    this.#controller.unregisterOption(handle);
  }

  isSelected(v: T): boolean {
    return isInArray(this.value(), v, this.isItemEqualToValue());
  }

  #setSingle(v: T): void {
    if (this.value().length === 1 && this.isSelected(v)) {
      return;
    }
    this.value.set([v]);
  }

  activate(v: T): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    if (this.multiple()) {
      this.value.set(toggleInArray(this.value(), v, this.isItemEqualToValue()));
      // Multi-select stays open — consumer closes via outside pointer / Escape / Tab.
      return;
    }
    // Single-mode: idempotent select + close. Skip the redundant set (and its
    // `valueChange` emission) when the same sole value is already selected.
    this.#setSingle(v);
    this.closeMenu('select');
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    this.#controller.navigate(currentOption, action, this.loop());
  }

  handleTypeahead(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const match = findTypeaheadMatch(
      this.options(),
      { buffer: this.#typeahead.buffer(), repeated: false, anchorIndex: -1 },
      (o) => o.host.textContent ?? '',
      (o) => o.disabled(),
    );
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
    const buffer = this.#closedTypeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    // Closed-state lookup goes through the cached snapshot — `[forSelectContent]`
    // is unmounted, so the live `options` registry is empty here. The cache
    // populates the first time the listbox opens and renders options.
    const cached = this.#cachedOptions();
    const match = cached.find((o) => o.label.toLowerCase().startsWith(buffer));
    if (match) {
      this.value.set([match.value]);
    }
    return true;
  }

  focusFirstEnabledOption(): boolean {
    return this.#controller.focusFirstEnabledOption();
  }

  focusLastEnabledOption(): boolean {
    return this.#controller.focusLastEnabledOption();
  }

  focusSelectedOption(): boolean {
    const values = this.value();
    if (values.length === 0) {
      return false;
    }
    const equals = this.isItemEqualToValue();
    const items = this.options();
    for (const v of values) {
      const opt = items.find((o) => equals(o.value(), v) && !o.disabled());
      if (opt) {
        opt.host.focus();
        return true;
      }
    }
    return false;
  }

  toggle(initialFocus: ForSelectInitialFocus = 'selected'): void {
    this.#controller.toggle(initialFocus);
  }

  openMenu(initialFocus: ForSelectInitialFocus = 'selected'): void {
    this.#controller.openMenu(initialFocus);
  }

  closeMenu(reason: ForSelectCloseReason): void {
    this.#controller.closeMenu(reason);
  }

  commitOnTab(value: T): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (!this.multiple() && !this.readonly()) {
      this.#setSingle(value);
    }
    // Move focus to the trigger BEFORE the unmount + close so the browser's
    // Tab default action has a stable active element to advance from. The
    // content's `DestroyRef` reads `lastCloseReason() === 'tab'` and skips
    // its own re-focus — otherwise it would steal focus back from wherever
    // the browser advanced it.
    this.#controller.focusTrigger();
    this.closeMenu('tab');
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    this.#controller.emitEscapeKeyDown(event, this.dismissible(), 'escape');
  }

  /**
   * Outside-interaction emit forwarders. The shared `#pendingOutsideVeto`
   * reuse between the specific outside channels and the composite
   * `interactOutside` lives in `injectOverlayShell`; these only fire the
   * matching output with the veto the shell built.
   */
  emitPointerDownOutside(veto: VetoableNativeEvent<PointerEvent>): void {
    this.#controller.emitPointerDownOutside(veto);
  }
  emitFocusOutside(veto: VetoableNativeEvent<FocusEvent>): void {
    this.#controller.emitFocusOutside(veto);
  }
  emitInteractOutside(veto: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.#controller.emitInteractOutside(veto);
  }

  /** Modal-path Escape forwarder: emit only; the modal shell owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.#controller.forwardEscapeKeyDown(veto);
  }

  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction. Marks the control touched (mirroring the trigger blur) and
   * closes with the channel's reason.
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.#controller.requestClose(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return this.#controller.emitAutoFocusOnOpen();
  }

  emitAutoFocusOnClose(): boolean {
    return this.#controller.emitAutoFocusOnClose();
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
    navigator.navigate('first');
  }

  handleVirtualizedKeydown(event: KeyboardEvent): void {
    if (!this.#virtualized() || this.effectiveDisabled()) {
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
      this.#requireNavigator().navigate(action);
      return;
    }
    this.#typeaheadVirtualized(event);
  }

  notifyOptionClick(optionId: string): void {
    if (!this.#virtualized()) {
      return;
    }
    this.#activeId.set(optionId);
    this.content()?.focus();
  }

  #committedIndex(navigator: SelectVirtualizedNavigator<T>): number | null {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const equals = this.isItemEqualToValue();
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

  #activateActiveDescendant(): void {
    const id = this.#activeId();
    if (id === null) {
      return;
    }
    const handle = this.options().find((o) => o.id() === id);
    if (!handle || handle.disabled()) {
      return;
    }
    this.activate(handle.value());
  }

  #commitActiveDescendantOnTab(): void {
    const id = this.#activeId();
    const handle = id === null ? undefined : this.options().find((o) => o.id() === id);
    if (handle && !handle.disabled()) {
      this.commitOnTab(handle.value());
      return;
    }
    this.closeMenu('tab');
  }

  #typeaheadVirtualized(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const match = findTypeaheadMatch(
      this.options(),
      { buffer: this.#typeahead.buffer(), repeated: false, anchorIndex: -1 },
      (o) => o.host.textContent ?? '',
      (o) => o.disabled(),
    );
    if (match) {
      this.#activeId.set(match.id());
      match.host.scrollIntoView?.({ block: 'nearest' });
    }
  }
}
