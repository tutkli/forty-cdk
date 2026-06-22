import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  InjectionToken,
  input,
} from '@angular/core';

import { registerHandle, hostId, resolveListNavigation } from 'forty-cdk/core';
import { injectRadioGroupContext } from './radio-group-context';

/**
 * Injection key the `[forRadioIndicator]` uses to resolve its parent radio,
 * decoupled from the concrete `ForRadio` class. `ForRadio` provides itself
 * under this token, so a design system wrapping the radio by subclassing
 * re-points it at the subclass with a single provider
 * (`{ provide: FOR_RADIO, useExisting: MtxRadio }`) and the indicator keeps
 * resolving — see `docs/wrapping-form-primitives.md`.
 */
export const FOR_RADIO = new InjectionToken<ForRadio>('FOR_RADIO');

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
  providers: [{ provide: FOR_RADIO, useExisting: ForRadio }],
  host: {
    role: 'radio',
    type: 'button',
    '[id]': 'id()',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForRadio {
  /** Parent group's context — public so siblings like `ForRadioIndicator` can read it. */
  readonly group = injectRadioGroupContext('ForRadio');
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Unique identifier for this radio's value. Required. */
  readonly value = input.required<string>();

  /** When true, this radio is disabled (independent of the group's disabled). */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly id = hostId('for-radio');

  readonly checked = computed(() => this.group.isSelected(this.value()));

  readonly effectiveDisabled = computed(() => this.disabled() || this.group.effectiveDisabled());

  constructor() {
    const handle = {
      host: this.#host.nativeElement,
      value: this.value,
      disabled: this.effectiveDisabled,
    };
    registerHandle(
      handle,
      (h) => this.group.registerRadio(h),
      (h) => this.group.unregisterRadio(h),
      'afterNextRender',
    );
  }

  /**
   * Tabindex per APG: 0 if this radio is selected; if no registered radio
   * matches the group's value (none selected, or a stale value matching no
   * radio), 0 if this is the first enabled radio in DOM order; -1 otherwise.
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
    if (this.group.hasSelectedRadio()) {
      return -1;
    }
    return this.group.isFirstEnabledRadio(this.#host.nativeElement) ? 0 : -1;
  });

  protected onClick(): void {
    if (this.effectiveDisabled() || this.group.readonly()) {
      return;
    }
    this.group.select(this.value());
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const action = resolveListNavigation(event, {
      orientation: this.group.orientation(),
      dir: this.group.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.group.navigate(this.#host.nativeElement, action);
  }
}
