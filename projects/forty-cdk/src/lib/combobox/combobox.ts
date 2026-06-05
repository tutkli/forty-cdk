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
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTextDirection } from '../_internal/text-direction/text-direction';
import {
  createVetoableNativeEvent,
  emitVetoableNativeEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_COMBOBOX_CONTEXT,
  type ForComboboxAutocomplete,
  type ForComboboxChipHandle,
  type ForComboboxCloseReason,
  type ForComboboxContext,
  type ForComboboxOptionHandle,
} from './combobox-context';
import { ComboboxSnapshot } from './combobox-snapshot';

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
    '[attr.data-disabled]': 'disabled() ? "" : null',
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
   * commit, `clear()`, multi-mode select reset), never on consumer writes
   * via `[(query)]`.
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
  readonly itemToFormValue = input<(item: T) => string>((item) =>
    typeof item === 'string' ? item : JSON.stringify(item),
  );

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
  readonly loop = input(true, { transform: booleanAttribute });

  /** When true (default), Escape, pointer-down outside, and focus outside close the listbox. */
  readonly dismissible = input(true, { transform: booleanAttribute });

  /** Manual `aria-label` on `[forComboboxContent]` when the input isn't a meaningful name. */
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

  readonly inputId = signal(this.#idGen.next('for-combobox-input'));
  readonly contentId = signal(this.#idGen.next('for-combobox-content'));

  readonly #inputEl = signal<HTMLInputElement | null>(null);
  readonly input = this.#inputEl.asReadonly();
  readonly anchor = computed<ReferenceElement | null>(() => this.#inputEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly options = this.#items.items;
  readonly chips = this.#chips.items;

  readonly #activeId = linkedSignal<string, string | null>({
    source: () => this.query(),
    computation: () => null,
  });
  readonly activeId = this.#activeId.asReadonly();

  readonly #initialFocus = signal<'first' | 'last'>('first');
  readonly initialFocus = this.#initialFocus.asReadonly();

  /**
   * Virtualization snapshot — keeps option metadata across close/open and
   * scroll-out-of-view, drives inline autocomplete matching, and powers
   * keyboard navigation past the rendered window. See `combobox-snapshot.ts`
   * for the full contract.
   */
  readonly #snapshot = new ComboboxSnapshot<T>({
    items: this.#items.items,
    totalCount: this.totalCount,
    visibleRange: this.visibleRange,
    loop: this.loop,
    getActiveId: () => this.#activeId(),
    setActiveId: (id) => this.#activeId.set(id),
    emitScrollToIndex: (idx) => this.scrollToIndex.emit(idx),
  });

  readonly selected = computed<readonly { value: T; label: string }[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    const cached = this.#snapshot.cachedOptions();
    const indexed = this.#snapshot.snapshotByPos();
    const equals = this.isItemEqualToValue();
    const toLabel = this.itemToStringLabel();
    return values.map((v) => {
      const opt = cached.find((o) => equals(o.value, v));
      if (opt) {
        return { value: v, label: opt.label };
      }
      // Fall back to the indexed snapshot — covers the virtualization case
      // where a selected option has scrolled out of view (so isn't in the
      // live `cached` list) but was rendered earlier.
      for (const entry of indexed.values()) {
        if (equals(entry.value, v)) {
          return { value: v, label: entry.label };
        }
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
  readonly selectedItem = computed<T | null>(() => {
    const values = this.value();
    return values.length === 1 ? values[0]! : null;
  });

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
      disabled: this.disabled,
    });

    // `#activeId` is the activedescendant pointer, not derived data: this
    // effect performs imperative DOM moves (`scrollIntoView`) and seeds the
    // pointer in response to the registered option set changing. It reacts to
    // `#items.items()`, `autoHighlight()` and `open()`; the `#activeId` read
    // is `untracked()` so the effect never re-runs from its own write (no
    // read-and-write of the same signal in the reactive scope) — re-seeding
    // after the active option unmounts is driven by the `items` change that
    // accompanies it, which also clears `#activeId` in `unregisterOption`.
    //
    // `#snapshot.prime()` eagerly pulls the snapshot caches so their
    // `linkedSignal` `prev` slot gets seeded while the listbox is open.
    // Without this, the lazy caches never run during the open cycle (no
    // other consumer pulls them in non-virtualized usage), and persistence
    // across close→re-open would start from an empty `prev`.
    effect(() => {
      this.#snapshot.prime();
      const items = this.#items.items();

      // Resolve a pending virtualized navigation: once the option for the
      // requested posInSet mounts, seed activedescendant to its id.
      if (this.#snapshot.tryResolvePending()) {
        return;
      }

      // Auto-highlight the first / last enabled option whenever the listbox
      // is open with no activedescendant (e.g. after the consumer's filter
      // removed the previously-active option, or right after openMenu()).
      // When virtualizing, seed among the currently-rendered options only —
      // never scroll the consumer's window. Scrolling the active option out
      // of view clears the activedescendant and re-enters this branch, so an
      // off-window seed would snap the listbox back to the top on every tick.
      if (
        this.autoHighlight() &&
        this.open() &&
        untracked(() => this.#activeId()) === null &&
        items.length > 0
      ) {
        const total = this.totalCount();
        if (total !== undefined) {
          this.#snapshot.seedFromIndexedSnapshot(
            this.#initialFocus() === 'last' ? 'last' : 'first',
          );
        } else {
          const target =
            this.#initialFocus() === 'last' ? findLastEnabled(items) : findFirstEnabled(items);
          if (target) {
            this.#activeId.set(target.id());
          }
        }
      }
    });
  }

  registerInput(el: HTMLInputElement): void {
    this.#inputEl.set(el);
  }
  unregisterInput(el: HTMLInputElement): void {
    if (this.#inputEl() === el) {
      this.#inputEl.set(null);
    }
  }

  registerContent(el: HTMLElement): void {
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
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
    const equals = this.isItemEqualToValue();
    return this.value().some((x) => equals(x, v));
  }

  isActive(id: string): boolean {
    return this.#activeId() === id;
  }

  activate(handle: ForComboboxOptionHandle<T>): void {
    if (this.disabled() || this.readonly() || handle.disabled()) {
      return;
    }
    const v = handle.value();
    const equals = this.isItemEqualToValue();
    if (this.multiple()) {
      // Toggle in/out of the array. Stay open so the user can keep picking.
      const current = this.value();
      const next = current.some((x) => equals(x, v))
        ? current.filter((x) => !equals(x, v))
        : [...current, v];
      this.value.set(next);
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
    if (this.commitOnSelect()) {
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
    if (this.disabled() || this.readonly()) {
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
    if (this.disabled()) {
      return;
    }
    if (this.totalCount() !== undefined) {
      this.#snapshot.navigateVirtualized(direction);
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
    if (this.disabled() || this.readonly()) {
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

  cachedOptions(): readonly { id: string; value: T; label: string }[] {
    return this.#snapshot.cachedOptions();
  }

  clear(clearQuery: boolean = true): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    this.value.set([]);
    if (clearQuery) {
      this.query.set('');
      this.#syncInputValue('');
    }
    this.#activeId.set(null);
  }

  setInitialFocus(target: 'first' | 'last'): void {
    this.#initialFocus.set(target);
  }

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu();
    }
  }

  openMenu(initialFocus: 'first' | 'last' = 'first'): void {
    if (this.disabled() || this.open()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.open.set(true);
  }

  closeMenu(_reason: ForComboboxCloseReason): void {
    if (!this.open()) {
      return;
    }
    this.open.set(false);
    this.#activeId.set(null);
    this.#snapshot.resetPending();
  }

  // Shared veto wrapper between `pointerDownOutside` / `focusOutside` and
  // the composite `interactOutside`. The dismissable layer always invokes
  // the specific listener before the composite one for the same physical
  // event, so a `preventDefault()` in either handler vetoes the close.
  #pendingOutsideVeto: VetoableNativeEvent<PointerEvent | FocusEvent> | null = null;

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.pointerDownOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<PointerEvent>);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.#pendingOutsideVeto = createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.focusOutside.emit(this.#pendingOutsideVeto as VetoableNativeEvent<FocusEvent>);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    const veto =
      this.#pendingOutsideVeto ?? createVetoableNativeEvent<PointerEvent | FocusEvent>(event);
    this.#pendingOutsideVeto = null;
    this.interactOutside.emit(veto);
    if (!veto.defaultPrevented && this.dismissible()) {
      this.markTouched();
      this.closeMenu('pointerDownOutside');
    }
  }

  markTouched(): void {
    this.touched.set(true);
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
