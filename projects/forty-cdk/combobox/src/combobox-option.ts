import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
} from '@angular/core';

import {
  accessibleTextContent,
  assertInputBound,
  isUnset,
  registerHandle,
  hostId,
  unsetInput,
} from 'forty-cdk/core';
import { injectComboboxContext } from './combobox-context';

/**
 * Injection key the `[forComboboxIndicator]` uses to resolve its parent
 * option, decoupled from the concrete `ForComboboxOption` class.
 * `ForComboboxOption` provides itself under this token, so a design system
 * wrapping the option by subclassing re-points it at the subclass with a
 * single provider (`{ provide: FOR_COMBOBOX_OPTION, useExisting: MtxComboboxOption }`)
 * and the indicator keeps resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_COMBOBOX_OPTION = new InjectionToken<ForComboboxOption>('FOR_COMBOBOX_OPTION');

/**
 * One option inside a `[forComboboxContent]`. Apply on whatever element
 * fits the design — typically a `<div>` or `<li>`. Click activates:
 * single mode replaces `[(value)]` and closes the listbox; multi mode
 * toggles the value in/out and keeps the listbox open.
 *
 * Generic over the option value type `T` (default `string`). Inferred from
 * the `[value]` binding so consumers can pass either primitive ids or
 * full objects (`[value]="city"` infers `T = City`); the parent
 * `[forCombobox]` must be parameterized over the same `T`.
 *
 * `aria-selected` reflects different things in single vs. multi:
 * - **Single mode**: the option that's the current activedescendant
 *   (Enter would activate it). Matches APG select-only-combobox.
 * - **Multi mode**: every option currently in `value()` carries
 *   `aria-selected="true"` (multiple "selected" entries simultaneously).
 *   Matches APG multi-select combobox.
 *
 * `data-state="checked" | "unchecked"` always reflects membership in
 * `value()` regardless of mode, so consumers can paint a checkmark with
 * pure CSS in either mode. `data-highlighted` marks the option that is
 * the current activedescendant — shared across the
 * library's roving / activedescendant primitives.
 *
 * Hovering an option also makes it the activedescendant, mirroring native
 * menu / select behavior so mouse and keyboard intent stay synchronized.
 */
@Directive({
  selector: '[forComboboxOption]',
  exportAs: 'forComboboxOption',
  providers: [{ provide: FOR_COMBOBOX_OPTION, useExisting: ForComboboxOption }],
  host: {
    role: 'option',
    '[id]': 'id()',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-posinset]': 'ariaPosInSet()',
    '[attr.aria-setsize]': 'ariaSetSize()',
    '[attr.data-state]': 'selected() ? "checked" : "unchecked"',
    '[attr.data-highlighted]': 'highlighted() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(pointermove)': 'onPointerMove()',
  },
})
export class ForComboboxOption<T = string> {
  readonly #ctx = injectComboboxContext<T>('ForComboboxOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize
   * the parent `[forCombobox]` over a richer `T`. The parent's
   * `[compareWith]` decides how options are matched against the
   * committed selection.
   *
   * Mandatory — an unbound option throws in dev mode.
   */
  readonly value = input(unsetInput<T>());

  /**
   * Visible label used by `[forComboboxInput]` for inline autocomplete
   * matching, by `commitOnSelect` to populate the input on selection,
   * and by typeahead / display utilities. When omitted: for string
   * `value` falls back to the trimmed `textContent` of the host element;
   * for object `value` falls back to the parent's `itemToStringLabel(value)`.
   */
  readonly label = input<string | null>(null);

  /**
   * Whether the option can be activated. A disabled option stays rendered and announced, and is
   * skipped by arrow navigation and typeahead.
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Absolute index of this option in the consumer's source array. Required
   * when wiring up a virtualized listbox so navigation past the rendered
   * window can resolve indices to options (and emit `(scrollToIndex)` when
   * needed). Leave `null` for non-virtualized lists — the directive then
   * falls back to DOM order.
   */
  readonly posInSet = input<number | null>(null);

  readonly id = hostId('for-combobox-option');

  readonly selected = computed(() => {
    const value = this.value();
    return isUnset(value) ? false : this.#ctx.isSelected(value);
  });
  /** True when this option is the current activedescendant. Reflected as `data-highlighted`. */
  readonly highlighted = computed(() => this.#ctx.isActive(this.id()));
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.effectiveDisabled());

  protected readonly ariaSelected = computed(() => {
    if (this.#ctx.multiple()) {
      return this.selected() ? 'true' : 'false';
    }
    return this.highlighted() ? 'true' : 'false';
  });

  /** Reflects `aria-posinset` (1-based) in the virtualized path; `null` otherwise. */
  protected readonly ariaPosInSet = computed<string | null>(() => {
    if (this.#ctx.totalCount() === undefined) {
      return null;
    }
    const pos = this.posInSet();
    return pos === null ? null : String(pos + 1);
  });

  /** Reflects `aria-setsize` when the consumer wires up `[totalCount]`. */
  protected readonly ariaSetSize = computed<string | null>(() => {
    const total = this.#ctx.totalCount();
    return total === undefined ? null : String(total);
  });

  readonly #effectiveLabel = computed(() => {
    const explicit = this.label();
    if (explicit !== null) {
      return explicit;
    }
    const v = this.value();
    if (isUnset(v)) {
      return '';
    }
    if (typeof v === 'string') {
      // String mode: the trimmed `textContent` is the canonical fallback,
      // identical to the pre-generic behaviour. Lets consumers omit
      // `[label]` and have it just work for projected text.
      return accessibleTextContent(this.#host.nativeElement).trim();
    }
    // Object mode: lean on the parent's `itemToStringLabel` so the
    // resolved label is consistent with chip rendering and `commitOnSelect`.
    return this.#ctx.itemToStringLabel()(v);
  });

  readonly #handle = {
    host: this.#host.nativeElement,
    id: this.id,
    value: this.value,
    label: this.#effectiveLabel,
    disabled: this.effectiveDisabled,
    posInSet: this.posInSet,
  };

  constructor() {
    assertInputBound(this.value, 'combobox', '[forComboboxOption]', 'value');
    registerHandle(
      this.#handle,
      (h) => this.#ctx.registerOption(h),
      (h) => this.#ctx.unregisterOption(h),
    );
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#ctx.readonly()) {
      return;
    }
    this.#ctx.activate(this.#handle);
  }

  protected onPointerMove(): void {
    if (this.effectiveDisabled() || this.#ctx.isPointerSuppressed()) {
      return;
    }
    if (!this.#ctx.isActive(this.id())) {
      this.#ctx.setActiveId(this.id());
    }
  }
}
