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

import { IdGenerator } from '../_internal/id-generator';
import { resolveListNavigation } from '../_internal/keyboard-navigation';
import { injectRadioGroupContext } from './radio-group-context';

/**
 * One radio inside a `ForRadioGroup`. Apply on a `<button type="button">`.
 *
 * The directive reflects ARIA + roving tabindex for the WAI-ARIA Radio
 * pattern: only the selected radio (or the first enabled one when nothing
 * is selected) gets `tabindex=0`.
 */
@Directive({
  selector: '[forRadio]',
  exportAs: 'forRadio',
  host: {
    role: 'radio',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-checked]': 'checked()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForRadio {
  readonly #group = injectRadioGroupContext('ForRadio');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #idGen = inject(IdGenerator);

  /** Unique identifier for this radio's value. Required. */
  readonly value = input.required<string>();

  /** When true, this radio is disabled (independent of the group's disabled). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = signal(this.#idGen.next('for-radio'));

  readonly checked = computed(() => this.#group.isSelected(this.value()));

  readonly effectiveDisabled = computed(
    () => this.disabled() || this.#group.disabled(),
  );

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    this.#group.registerRadio(handle);
    inject(DestroyRef).onDestroy(() => this.#group.unregisterRadio(handle));
  }

  /**
   * Tabindex per APG: 0 if this radio is selected; if no selection, 0 if
   * this is the first enabled radio in DOM order; -1 otherwise.
   *
   * Disabled radios are always -1.
   */
  readonly tabindex = computed<-1 | 0>(() => {
    if (this.effectiveDisabled()) {
      return -1;
    }
    if (this.checked()) {
      return 0;
    }
    if (this.#group.value() !== '') {
      return -1;
    }
    return this.#group.isFirstEnabledRadio(this.#host.nativeElement) ? 0 : -1;
  });

  protected onClick(): void {
    if (this.effectiveDisabled() || this.#group.readonly()) {
      return;
    }
    this.#group.select(this.value());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.#group.orientation(),
      dir: this.#group.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.#group.navigate(this.#host.nativeElement, action);
  }
}
