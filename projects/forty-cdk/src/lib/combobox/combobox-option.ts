import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { IdGenerator } from '../_internal/id-generator/id-generator';
import { injectComboboxContext } from './combobox-context';

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
 * the current activedescendant — Radix-aligned and shared across the
 * library's roving / activedescendant primitives.
 *
 * Hovering an option also makes it the activedescendant, mirroring native
 * menu / select behavior so mouse and keyboard intent stay synchronized.
 */
@Directive({
  selector: '[forComboboxOption]',
  exportAs: 'forComboboxOption',
  host: {
    role: 'option',
    '[id]': 'id()',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
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
  readonly #idGen = inject(IdGenerator);

  /**
   * Stable identifier serialized into `[(value)]` and the hidden input.
   * Defaults to `string` for back-compat; bind an object to specialize
   * the parent `[forCombobox]` over a richer `T`. The parent's
   * `[isItemEqualToValue]` decides how options are matched against the
   * committed selection.
   */
  readonly value = input.required<T>();

  /**
   * Visible label used by `[forComboboxInput]` for inline autocomplete
   * matching, by `commitOnSelect` to populate the input on selection,
   * and by typeahead / display utilities. When omitted: for string
   * `value` falls back to the trimmed `textContent` of the host element;
   * for object `value` falls back to the parent's `itemToStringLabel(value)`.
   */
  readonly label = input<string | null>(null);

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-combobox-option'));

  readonly selected = computed(() => this.#ctx.isSelected(this.value()));
  /** True when this option is the current activedescendant. Reflected as `data-highlighted`. */
  readonly highlighted = computed(() => this.#ctx.isActive(this.id()));
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.disabled());

  protected readonly ariaSelected = computed(() => {
    if (this.#ctx.multiple()) {
      return this.selected() ? 'true' : 'false';
    }
    return this.highlighted() ? 'true' : 'false';
  });

  readonly #effectiveLabel = computed(() => {
    const explicit = this.label();
    if (explicit !== null) {
      return explicit;
    }
    const v = this.value();
    if (typeof v === 'string') {
      // String mode: the trimmed `textContent` is the canonical fallback,
      // identical to the pre-generic behaviour. Lets consumers omit
      // `[label]` and have it just work for projected text.
      return (this.#host.nativeElement.textContent ?? '').trim();
    }
    // Object mode: lean on the parent's `itemToStringLabel` so the
    // resolved label is consistent with chip rendering and `commitOnSelect`.
    return this.#ctx.itemToStringLabel()(v);
  });

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      id: this.id,
      value: this.value,
      label: this.#effectiveLabel,
      disabled: this.effectiveDisabled,
    };
    this.#ctx.registerOption(handle);
    inject(DestroyRef).onDestroy(() => this.#ctx.unregisterOption(handle));
  }

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#ctx.readonly()) {
      return;
    }
    const handle = {
      host: this.#host.nativeElement,
      id: this.id,
      value: this.value,
      label: this.#effectiveLabel,
      disabled: this.effectiveDisabled,
    };
    this.#ctx.activate(handle);
  }

  protected onPointerMove(): void {
    if (this.effectiveDisabled()) {
      return;
    }
    if (!this.#ctx.isActive(this.id())) {
      this.#ctx.setActiveId(this.id());
    }
  }
}
