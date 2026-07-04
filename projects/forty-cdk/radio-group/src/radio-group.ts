import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  Collection,
  firstEnabledHost,
  FormUiControlBase,
  injectHiddenInput,
  type ListNavigationAction,
  moveIndex,
  type WritingDirection,
  injectTextDirection,
} from 'forty-cdk/core';
import {
  FOR_RADIO_GROUP_CONTEXT,
  type ForRadioGroupContext,
  type ForRadioHandle,
} from './radio-group-context';
import { FOR_RADIO_GROUP_DEFAULTS } from './radio-group-defaults';

/**
 * Root of the Radio Group primitive. Owns the selected value, orientation,
 * and disabled / readonly / form-state inputs. Provides the shared context
 * to descendant `ForRadio` directives.
 *
 * Implements the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
 * and `FormValueControl<string | null>` from `@angular/forms/signals`, so it
 * auto-wires with `[formField]`.
 *
 * Selection-on-focus: arrow keys move focus AND change the value (APG
 * standard behavior). All four cursors navigate in either orientation (the
 * horizontal pair is RTL-mirrored); `orientation` is a layout / aria hint
 * only. Wrap-around at the ends. Disabled radios are skipped. Under
 * `readonly`, arrows still move focus but never change the value.
 *
 * `null` is the canonical "nothing selected" value, matching every other
 * scalar `FormValueControl` in the library (`T | null`). Choose non-empty
 * `value`s on each `ForRadio`.
 */
@Directive({
  selector: '[forRadioGroup]',
  exportAs: 'forRadioGroup',
  host: {
    role: 'radiogroup',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.dir]': 'dir()',
    '(focusout)': 'onFocusOut($event)',
  },
  providers: [{ provide: FOR_RADIO_GROUP_CONTEXT, useExisting: ForRadioGroup }],
})
export class ForRadioGroup
  extends FormUiControlBase
  implements FormValueControl<string | null>, ForRadioGroupContext
{
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #defaults = inject(FOR_RADIO_GROUP_DEFAULTS);

  /** Two-way bindable. Selected radio's value; `null` = none selected. */
  readonly value = model<string | null>(null);

  /**
   * Layout hint reflected as `aria-orientation` and `data-orientation`. It
   * does **not** restrict keyboard navigation — per the WAI-ARIA Radio Group
   * pattern all four arrow keys move focus + selection in either orientation
   * (the horizontal pair is RTL-mirrored). Use it to drive the visual layout
   * and expose the axis to assistive tech.
   */
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');

  /**
   * Reading direction. When unset (default `null`), the inherited ambient
   * direction is resolved from the nearest ancestor carrying a `dir`
   * attribute (or `<html dir>`), defaulting to `'ltr'`. An explicit `[dir]`
   * always wins. The resolved value is reflected to the host `dir` attribute.
   * In RTL it mirrors the horizontal cursor pair (ArrowLeft / ArrowRight) in
   * either orientation; the vertical pair (ArrowUp / ArrowDown) is unaffected.
   */
  readonly _dirInput = input<WritingDirection | null>(null, { alias: 'dir' });
  readonly dir = injectTextDirection(this._dirInput);

  /**
   * Whether arrow navigation wraps around past the first / last enabled
   * radio. Default `true` — matches the WAI-ARIA Radio Group APG. Set to
   * `false` for a non-wrapping group. The default is read from
   * `provideForRadioGroupDefaults` for the surrounding scope.
   */
  readonly loop = input(this.#defaults.loop, { transform: booleanAttribute });

  readonly #items = new Collection<ForRadioHandle>();

  readonly #firstEnabledHost = computed(() => firstEnabledHost(this.#items.items()));

  /** True when some registered, enabled radio's value matches the group's current value. */
  readonly hasSelectedRadio = computed(() => {
    const v = this.value();
    return this.#items.items().some((item) => !item.disabled() && item.value() === v);
  });

  constructor() {
    super();
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const v = this.value();
        return v ? [v] : [];
      }),
      disabled: this.effectiveDisabled,
    });
  }

  /**
   * Move focus to a radio, implementing `FormUiControl.focus` from
   * `@angular/forms/signals`. Without this override Signal Forms would focus
   * the host `role="radiogroup"` wrapper — which is not focusable and carries
   * no keyboard map — so focus-on-error would silently go nowhere. Targets the
   * selected radio's host when one matches, else the first enabled radio host;
   * no-op when the group is disabled or has no enabled radio.
   */
  focus(options?: FocusOptions): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const v = this.value();
    const selected = this.#items.items().find((item) => !item.disabled() && item.value() === v);
    const target = selected?.host ?? this.#firstEnabledHost();
    target?.focus(options);
  }

  isSelected(v: string): boolean {
    return this.value() === v;
  }

  select(v: string): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.value.set(v);
  }

  navigate(currentRadio: HTMLElement, action: ListNavigationAction): void {
    if (this.effectiveDisabled()) {
      return;
    }
    const items = this.#items.items();
    if (items.length === 0) {
      return;
    }
    const currentIndex = items.findIndex((item) => item.host === currentRadio);
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
    if (this.readonly()) {
      return;
    }
    this.value.set(target.value());
  }

  isFirstEnabledRadio(el: HTMLElement): boolean {
    return this.#firstEnabledHost() === el;
  }

  registerRadio(handle: ForRadioHandle): void {
    this.#items.register(handle);
  }

  unregisterRadio(handle: ForRadioHandle): void {
    this.#items.unregister(handle);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as HTMLElement | null;
    if (next && this.#host.nativeElement.contains(next)) {
      return;
    }
    this.markTouched();
  }
}
