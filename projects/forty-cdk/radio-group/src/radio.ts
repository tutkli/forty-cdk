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
  hostButtonType,
  registerHandle,
  hostId,
  resolveListNavigation,
  selectionTabStop,
} from 'forty-cdk/core';
import { type ForRadioGroupContext, injectRadioGroupContext } from './radio-group-context';

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
 *
 * A read-only group is reflected here as the boolean `data-readonly`
 * styling hook only. `aria-readonly` is not a supported property of
 * `role="radio"` (WAI-ARIA 1.2 lists it on `radiogroup`, not `radio`), so
 * the ARIA announcement stays on the `[forRadioGroup]` root, which does
 * support it.
 */
@Directive({
  selector: '[forRadio]',
  exportAs: 'forRadio',
  providers: [{ provide: FOR_RADIO, useExisting: ForRadio }],
  host: {
    role: 'radio',
    '[attr.type]': 'buttonType()',
    '[id]': 'id()',
    '[attr.aria-checked]': 'checked() ? "true" : "false"',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-state]': 'checked() ? "checked" : "unchecked"',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'group.readonly() ? "" : null',
    '[attr.data-orientation]': 'group.orientation()',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
})
export class ForRadio {
  protected readonly buttonType = hostButtonType();

  readonly #ctx = injectRadioGroupContext('ForRadio');

  /**
   * Parent group's read surface — public so siblings like `ForRadioIndicator`
   * can read it. Deliberately typed as the public {@link ForRadioGroupContext}:
   * the registration protocol behind it stays internal.
   */
  readonly group: ForRadioGroupContext = this.#ctx;
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
      (h) => this.#ctx.registerRadio(h),
      (h) => this.#ctx.unregisterRadio(h),
      'afterNextRender',
    );
  }

  /**
   * Tabindex per APG: 0 if this radio is selected; if no registered enabled
   * radio matches the group's value (none selected, a stale value matching no
   * radio, or the sole match is disabled), 0 if this is the first enabled radio
   * in DOM order; -1 otherwise.
   *
   * Disabled radios are always -1.
   *
   * The ladder is the shared `selectionTabStop`, and this is the one piece in
   * the library that resolves it **without** consulting a `RovingTabindex`:
   * selection follows focus in the Radio Group pattern, so the group's Tab entry
   * point is its checked radio and there is no user-driven roving pointer that
   * could diverge from it. See the roving-tabindex contract's adopter guard
   * for why that
   * makes RadioGroup a declared member of the roving family rather than a
   * derived one.
   */
  readonly tabindex = computed<-1 | 0>(() =>
    selectionTabStop({
      disabled: this.effectiveDisabled(),
      selected: this.checked(),
      hasSelected: this.group.hasSelectedRadio(),
      isFirstEnabled: this.group.isFirstEnabledRadio(this.#host.nativeElement),
    }),
  );

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
      orientation: 'both',
      dir: this.group.dir(),
    });
    if (!action) {
      return;
    }
    event.preventDefault();
    this.group.navigate(this.#host.nativeElement, action);
  }
}
