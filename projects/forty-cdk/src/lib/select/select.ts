import {
  afterEveryRender,
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import type { ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl } from '@angular/forms/signals';

import { Collection } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type ListNavigationAction,
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
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  emitVetoableEvent,
  emitVetoableNativeEvent,
  type VetoableEvent,
  type VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import {
  FOR_SELECT_CONTEXT,
  type ForSelectCloseReason,
  type ForSelectContext,
  type ForSelectInitialFocus,
  type ForSelectOptionHandle,
} from './select-context';
import { FOR_SELECT_DEFAULTS } from './select-defaults';

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
  readonly #items = new Collection<ForSelectOptionHandle<T>>();
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
   * `alignOffset`, `sticky`, `hideWhenDetached`, `avoidCollisions`,
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
   *   `sticky`, `hideWhenDetached`, and `avoidCollisions` are ignored in
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
   * Mirrors Radix's `sideOffset`. The default is read from
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

  readonly loop = input(true, { transform: booleanAttribute });
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

  readonly triggerId = signal(this.#idGen.next('for-select-trigger'));
  readonly contentId = signal(this.#idGen.next('for-select-content'));

  readonly #initialFocus = signal<ForSelectInitialFocus>('selected');
  readonly initialFocus = this.#initialFocus.asReadonly();

  readonly #lastCloseReason = signal<ForSelectCloseReason | null>(null);
  readonly lastCloseReason = this.#lastCloseReason.asReadonly();

  readonly #triggerEl = signal<HTMLElement | null>(null);
  readonly trigger = this.#triggerEl.asReadonly();
  readonly anchor = computed<ReferenceElement | null>(() => this.#triggerEl());

  readonly #contentEl = signal<HTMLElement | null>(null);
  readonly content = this.#contentEl.asReadonly();

  readonly options = this.#items.items;

  /**
   * Snapshot of the last non-empty option set, used by closed-state typeahead
   * and `[forSelectValue]` label rendering — the live `#items` registry is
   * empty whenever `[forSelectContent]` is unmounted. Updated by an
   * `afterEveryRender` hook (reading `textContent` reliably requires a
   * post-render phase; an effect or linkedSignal would race with text-node
   * commits).
   */
  readonly #cachedOptions = signal<readonly { value: T; label: string }[]>([]);

  /**
   * Trimmed display labels of the selected values, in selection order.
   *
   * Invariant: when no `[itemToLabel]` is supplied the label is read from the
   * option host's `textContent` — a non-reactive source inside this `computed`.
   * A label that changes its rendered text without a value change therefore
   * self-heals only via the `#cachedOptions` snapshot, which the
   * `afterEveryRender` hook re-warms each render. Supply `[itemToLabel]` for a
   * pure signal derivation that observes label changes directly.
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
    // Otherwise resolve from the live option registry first so a pre-set value
    // renders the option label as soon as `[forSelectOption]` registers, then
    // the cached snapshot (warmed by `afterEveryRender`, used while the listbox
    // is unmounted), then the serialized form value so non-string items still
    // render meaningfully on a cold cache.
    const items = this.#items.items();
    const cached = this.#cachedOptions();
    const equals = this.isItemEqualToValue();
    const toFormValue = this.itemToFormValue();
    const labels: string[] = [];
    for (const v of values) {
      const live = items.find((o) => equals(o.value(), v));
      if (live) {
        labels.push((live.host.textContent ?? '').trim());
        continue;
      }
      const opt = cached.find((o) => equals(o.value, v));
      labels.push(opt ? opt.label : typeof v === 'string' ? (v as string) : toFormValue(v));
    }
    return labels;
  });

  readonly selectedOptionEl = computed<HTMLElement | null>(() => {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const equals = this.isItemEqualToValue();
    const items = this.#items.items();
    for (const v of values) {
      const opt = items.find((o) => equals(o.value(), v));
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

  constructor() {
    super();
    injectHiddenInput<T>({
      name: this.name,
      values: this.value,
      serialize: (item) => this.itemToFormValue()(item),
      disabled: this.effectiveDisabled,
    });

    afterEveryRender(() => {
      const items = this.#items.items();
      if (items.length === 0) {
        // Keep the previous snapshot when the listbox unmounts so closed-
        // state typeahead and `[forSelectValue]` rendering still resolve.
        return;
      }
      const next: { value: T; label: string }[] = new Array(items.length);
      const cached = this.#cachedOptions();
      let changed = cached.length !== items.length;
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        const value = item.value();
        const label = (item.host.textContent ?? '').trim();
        next[i] = { value, label };
        if (!changed) {
          const prev = cached[i]!;
          if (prev.value !== value || prev.label !== label) {
            changed = true;
          }
        }
      }
      if (changed) {
        this.#cachedOptions.set(next);
      }
    });
  }

  setInitialFocus(target: ForSelectInitialFocus): void {
    this.#initialFocus.set(target);
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
    this.#contentEl.set(el);
  }
  unregisterContent(el: HTMLElement): void {
    if (this.#contentEl() === el) {
      this.#contentEl.set(null);
    }
  }

  registerOption(handle: ForSelectOptionHandle<T>): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: ForSelectOptionHandle<T>): void {
    this.#items.unregister(handle);
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
    if (this.effectiveDisabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((o) => o.host === currentOption);
    const next = moveIndex(currentIndex < 0 ? 0 : currentIndex, items.length, action, {
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
    target.host.focus();
    if (!this.multiple() && this.selectionFollowsFocus() && !this.readonly()) {
      this.#setSingle(target.value());
    }
  }

  handleTypeahead(event: KeyboardEvent): void {
    if (!this.#typeahead.handle(event)) {
      return;
    }
    const buffer = this.#typeahead.buffer().toLowerCase();
    if (!buffer) {
      return;
    }
    const items = this.#items.items();
    const match = items.find((o) => {
      if (o.disabled()) {
        return false;
      }
      const text = (o.host.textContent ?? '').trim().toLowerCase();
      return text.startsWith(buffer);
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
    const buffer = this.#closedTypeahead.buffer().toLowerCase();
    if (!buffer) {
      return true;
    }
    // Closed-state lookup goes through the cached snapshot — `[forSelectContent]`
    // is unmounted, so the live `#items` registry is empty here. The cache
    // populates the first time the listbox opens and renders options.
    const cached = this.#cachedOptions();
    const match = cached.find((o) => o.label.toLowerCase().startsWith(buffer));
    if (match) {
      this.value.set([match.value]);
    }
    return true;
  }

  focusFirstEnabledOption(): boolean {
    const target = this.#items.items().find((o) => !o.disabled());
    if (!target) {
      return false;
    }
    target.host.focus();
    return true;
  }

  focusLastEnabledOption(): boolean {
    const items = this.#items.items();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && !item.disabled()) {
        item.host.focus();
        return true;
      }
    }
    return false;
  }

  focusSelectedOption(): boolean {
    const values = this.value();
    if (values.length === 0) {
      return false;
    }
    const equals = this.isItemEqualToValue();
    const items = this.#items.items();
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
    if (this.effectiveDisabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: ForSelectInitialFocus = 'selected'): void {
    if (this.effectiveDisabled()) {
      return;
    }
    this.#initialFocus.set(initialFocus);
    this.#lastCloseReason.set(null);
    this.open.set(true);
  }

  closeMenu(reason: ForSelectCloseReason): void {
    this.#lastCloseReason.set(reason);
    this.open.set(false);
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
    this.#triggerEl()?.focus();
    this.closeMenu('tab');
  }

  emitEscapeKeyDown(event: KeyboardEvent): void {
    const vetoed = emitVetoableNativeEvent(this.escapeKeyDown, event);
    if (!vetoed && this.dismissible()) {
      event.stopPropagation();
      this.markTouched();
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

  /** Modal-path Escape forwarder: emit only; the modal shell owns the close. */
  forwardEscapeKeyDown(veto: VetoableNativeEvent<KeyboardEvent>): void {
    this.escapeKeyDown.emit(veto);
  }

  /**
   * Implicit close requested by the shell after an un-vetoed outside
   * interaction. Marks the control touched (mirroring the trigger blur) and
   * closes with the channel's reason.
   */
  requestClose(reason: 'pointerDownOutside' | 'focusOutside'): void {
    this.markTouched();
    this.closeMenu(reason);
  }

  emitAutoFocusOnOpen(): boolean {
    return emitVetoableEvent(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitVetoableEvent(this.autoFocusOnClose);
  }

  override markTouched(): void {
    super.markTouched();
  }
}
