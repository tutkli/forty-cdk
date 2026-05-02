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
 * `aria-selected` reflects different things in single vs. multi:
 * - **Single mode**: the option that's the current activedescendant
 *   (Enter would activate it). Matches APG select-only-combobox.
 * - **Multi mode**: every option currently in `value()` carries
 *   `aria-selected="true"` (multiple "selected" entries simultaneously).
 *   Matches APG multi-select combobox.
 *
 * `data-state="checked" | "unchecked"` always reflects membership in
 * `value()` regardless of mode, so consumers can paint a checkmark with
 * pure CSS in either mode. `data-active` marks the option that is the
 * activedescendant.
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
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(pointermove)': 'onPointerMove()',
  },
})
export class ForComboboxOption {
  readonly #ctx = injectComboboxContext('ForComboboxOption');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  /** Stable string identifier serialized into `[(value)]` and the hidden input. */
  readonly value = input.required<string>();

  /**
   * Visible label used by `[forComboboxInput]` for inline autocomplete
   * matching, by `commitOnSelect` to populate the input on selection,
   * and by typeahead / display utilities. Defaults to the trimmed
   * `textContent` of the host element when omitted.
   */
  readonly label = input<string | null>(null);

  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-combobox-option'));

  readonly selected = computed(() => this.#ctx.isSelected(this.value()));
  readonly active = computed(() => this.#ctx.isActive(this.id()));
  readonly effectiveDisabled = computed(() => this.disabled() || this.#ctx.disabled());

  protected readonly ariaSelected = computed(() => {
    if (this.#ctx.multiple()) {
      return this.selected() ? 'true' : 'false';
    }
    return this.active() ? 'true' : 'false';
  });

  readonly #effectiveLabel = computed(() => {
    const explicit = this.label();
    if (explicit !== null) {
      return explicit;
    }
    return (this.#host.nativeElement.textContent ?? '').trim();
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
