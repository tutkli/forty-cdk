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
import type { Placement, ReferenceElement } from '@floating-ui/dom';
import type { FormValueControl } from '@angular/forms/signals';

import {
  emitAutoFocusOnClose,
  emitAutoFocusOnOpen,
} from '../_internal/auto-focus-event/auto-focus-event';
import { Collection } from '../_internal/collection/collection';
import type { FloatingAlign, FloatingSide } from '../_internal/floating/floating';
import { injectFormControlReflection } from '../_internal/form-control-reflection/form-control-reflection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { IdGenerator } from '../_internal/id-generator/id-generator';
import {
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
} from '../_internal/keyboard-navigation/keyboard-navigation';
import { injectTypeahead } from '../_internal/typeahead/typeahead';
import {
  FOR_SELECT_CONTEXT,
  type ForSelectCloseReason,
  type ForSelectContext,
  type ForSelectInitialFocus,
  type ForSelectOptionHandle,
} from './select-context';

/**
 * Headless implementation of the [WAI-ARIA select-only combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).
 * Implements `FormValueControl<readonly string[]>` from
 * `@angular/forms/signals` for `[formField]` auto-wiring.
 *
 * Selection is always modeled as `readonly string[]`:
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
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
  providers: [{ provide: FOR_SELECT_CONTEXT, useExisting: ForSelect }],
})
export class ForSelect
  extends FormUiControlBase
  implements FormValueControl<readonly string[]>, ForSelectContext
{
  readonly #idGen = inject(IdGenerator);
  readonly #typeahead = injectTypeahead();
  readonly #closedTypeahead = injectTypeahead();
  readonly #items = new Collection<ForSelectOptionHandle>();

  /**
   * Two-way bindable. Selected option values. Single-mode keeps 0 or 1
   * element. The `model()` change emitter (`(valueChange)`) fires only on
   * internal selection changes, never on consumer writes via `[(value)]`.
   */
  readonly value = model<readonly string[]>([]);

  /**
   * Two-way bindable. Whether the listbox is currently shown. The `model()`
   * change emitter (`(openChange)`) fires only on internal transitions
   * (trigger toggle, Escape, outside dismissal, single-mode option select),
   * never on consumer writes via `[(open)]`.
   */
  readonly open = model<boolean>(false);

  readonly multiple = input(false, { transform: booleanAttribute });

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
   *   `placement`, `sticky`, `hideWhenDetached`, and `avoidCollisions` are
   *   ignored in this mode; only `collisionPadding` is honored.
   */
  readonly position = input<'popper' | 'item-aligned'>('popper');

  /**
   * Floating-ui placement. Default `'bottom-start'`. Legacy single-string
   * API — new code should prefer the `side` + `align` pair. Ignored when
   * `position="item-aligned"`.
   */
  readonly placement = input<Placement>('bottom-start');

  /**
   * Side the listbox is anchored to. When set, takes precedence over
   * `placement`. Pair with `align` for the full positioning API.
   */
  readonly side = input<FloatingSide | undefined>(undefined);

  /** Alignment along the chosen `side`. Defaults to `'center'`. */
  readonly align = input<FloatingAlign | undefined>(undefined);

  /** Gap (px) between trigger and listbox along the main axis. Default `4`. Legacy alias for `sideOffset`. */
  readonly offset = input<number>(4);

  /** Gap (px) along the main axis. When set, overrides the legacy `offset`. */
  readonly sideOffset = input(undefined, {
    transform: (v: unknown): number | undefined => (v == null ? undefined : numberAttribute(v)),
  });

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

  /** When `true`, sets `data-detached=""` while the trigger is scrolled off-screen. */
  readonly hideWhenDetached = input(false, { transform: booleanAttribute });

  readonly loop = input(true, { transform: booleanAttribute });
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');
  readonly dir = input<WritingDirection>('ltr');

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

  readonly escapeKeyDown = output<KeyboardEvent>();
  readonly pointerDownOutside = output<PointerEvent>();
  readonly focusOutside = output<FocusEvent>();
  readonly interactOutside = output<PointerEvent | FocusEvent>();

  /**
   * Fires just before the listbox sends focus to the selected option
   * (or first / last enabled) on mount. Call `event.preventDefault()`
   * to skip the imperative focus move.
   */
  readonly autoFocusOnOpen = output<CustomEvent>();

  /**
   * Fires just before focus returns to the trigger on unmount.
   * `preventDefault()` suppresses the return-focus.
   */
  readonly autoFocusOnClose = output<CustomEvent>();

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
  readonly #cachedOptions = signal<readonly { value: string; label: string }[]>([]);

  readonly selectedLabels = computed<readonly string[]>(() => {
    const values = this.value();
    if (values.length === 0) {
      return [];
    }
    const cached = this.#cachedOptions();
    const labels: string[] = [];
    for (const v of values) {
      const opt = cached.find((o) => o.value === v);
      labels.push(opt ? opt.label : v);
    }
    return labels;
  });

  readonly selectedOptionEl = computed<HTMLElement | null>(() => {
    const values = this.value();
    if (values.length === 0) {
      return null;
    }
    const items = this.#items.items();
    for (const v of values) {
      const opt = items.find((o) => o.value() === v && !o.disabled());
      if (opt) {
        return opt.host;
      }
    }
    return null;
  });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: this.value,
      disabled: this.disabled,
    });
    injectFormControlReflection({
      touched: this.touched,
      dirty: this.dirty,
      pending: this.pending,
      invalid: this.invalid,
    });

    afterEveryRender(() => {
      const items = this.#items.items();
      if (items.length === 0) {
        // Keep the previous snapshot when the listbox unmounts so closed-
        // state typeahead and `[forSelectValue]` rendering still resolve.
        return;
      }
      const next: { value: string; label: string }[] = new Array(items.length);
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

  registerOption(handle: ForSelectOptionHandle): void {
    this.#items.register(handle);
  }
  unregisterOption(handle: ForSelectOptionHandle): void {
    this.#items.unregister(handle);
  }

  isSelected(v: string): boolean {
    return this.value().includes(v);
  }

  activate(v: string): void {
    if (this.disabled() || this.readonly()) {
      return;
    }
    if (this.multiple()) {
      const current = this.value();
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      this.value.set(next);
      // Multi-select stays open — consumer closes via outside pointer / Escape / Tab.
      return;
    }
    // Single-mode: idempotent select + close.
    this.value.set([v]);
    this.closeMenu('select');
  }

  navigate(currentOption: HTMLElement, action: ListNavigationAction): void {
    if (this.disabled()) {
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
      this.value.set([target.value()]);
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
    if (this.multiple() || this.disabled() || this.readonly()) {
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
    const items = this.#items.items();
    for (const v of values) {
      const opt = items.find((o) => o.value() === v && !o.disabled());
      if (opt) {
        opt.host.focus();
        return true;
      }
    }
    return false;
  }

  toggle(initialFocus: ForSelectInitialFocus = 'selected'): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.closeMenu('programmatic');
    } else {
      this.openMenu(initialFocus);
    }
  }

  openMenu(initialFocus: ForSelectInitialFocus = 'selected'): void {
    if (this.disabled()) {
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

  commitOnTab(value: string): void {
    if (this.disabled()) {
      return;
    }
    if (!this.multiple() && !this.readonly()) {
      this.value.set([value]);
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
    this.escapeKeyDown.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      event.stopPropagation();
      this.touched.set(true);
      this.closeMenu('escape');
    }
  }

  emitPointerDownOutside(event: PointerEvent): void {
    this.pointerDownOutside.emit(event);
  }

  emitFocusOutside(event: FocusEvent): void {
    this.focusOutside.emit(event);
  }

  emitInteractOutside(event: PointerEvent | FocusEvent): void {
    this.interactOutside.emit(event);
    if (!event.defaultPrevented && this.dismissible()) {
      this.touched.set(true);
      this.closeMenu('pointerDownOutside');
    }
  }

  emitAutoFocusOnOpen(): boolean {
    return emitAutoFocusOnOpen(this.autoFocusOnOpen);
  }

  emitAutoFocusOnClose(): boolean {
    return emitAutoFocusOnClose(this.autoFocusOnClose);
  }

  markTouched(): void {
    this.touched.set(true);
  }
}
