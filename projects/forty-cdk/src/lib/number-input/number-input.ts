import { computed, DestroyRef, Directive, ElementRef, inject, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { reflectDisabled } from '../_internal/disabled-reflection/disabled-reflection';
import { FormUiControlBase } from '../_internal/form-ui-control/form-ui-control-base';
import { mirrorUnfocusedValue } from '../_internal/form-ui-control/unfocused-value-mirror';
import { injectHiddenInput } from '../_internal/hidden-input/hidden-input';
import { localeSeparators, parseLocaleNumber } from '../_internal/locale-number/locale-number';
import { clamp, roundToStepPrecision } from '../_internal/numeric-step/numeric-step';
import { FOR_NUMBER_INPUT_GROUP, type ForNumberInputContext } from './number-input-context';
import { FOR_NUMBER_INPUT_DEFAULTS } from './number-input-defaults';

/**
 * Headless implementation of the
 * [WAI-ARIA Spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)
 * and Angular's `FormValueControl<number | null>` from `@angular/forms/signals`,
 * so it auto-wires with `[formField]` and auto-associates inside a `[forField]`
 * (label / description / error) with no extra markup.
 *
 * Apply on a `<input type="text" inputmode="numeric">` — not `type="number"`,
 * whose native UI is unstylable and locale-quirky. The directive owns parsing,
 * clamping to `[min, max]`, the full Spinbutton keyboard map, and optional
 * `Intl.NumberFormat`-based display formatting. The focusable spinbutton input
 * itself is the `FormValueControl`; the `[forNumberInputIncrement]` /
 * `[forNumberInputDecrement]` buttons are auxiliary pointer affordances.
 *
 * Because the displayed (formatted) text can differ from the submitted value,
 * the directive mounts a hidden `<input>` carrying the raw number for native
 * form submission when `name` is set — deliberately unlike `ForInput`, whose
 * visible element is itself the submittable field.
 *
 * The host gets `data-empty` (while the value is `null`), `data-disabled`, and
 * `data-readonly` for CSS hooks, plus `data-touched` / `data-dirty` /
 * `data-pending` / `data-invalid` from the shared form-control reflection.
 *
 * @example
 * ```html
 * <button forNumberInputDecrement aria-label="Decrease">−</button>
 * <input forNumberInput [(value)]="qty" [min]="0" [max]="10" [step]="1" />
 * <button forNumberInputIncrement aria-label="Increase">+</button>
 *
 * <!-- With Signal Forms + Field (auto-wired): -->
 * <div forField>
 *   <label forLabel>Quantity</label>
 *   <input forNumberInput [formField]="order.qty" [min]="1" />
 * </div>
 * ```
 */
@Directive({
  selector: '[forNumberInput]',
  exportAs: 'forNumberInput',
  host: {
    role: 'spinbutton',
    '[attr.inputmode]': 'inputmode()',
    '[attr.aria-valuenow]': 'value() ?? null',
    '[attr.aria-valuemin]': 'min() ?? null',
    '[attr.aria-valuemax]': 'max() ?? null',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-disabled]': 'effectiveDisabled() ? "true" : null',
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-busy]': 'pending() ? "true" : null',
    '[attr.readonly]': 'readonly() ? "" : null',
    '[attr.data-empty]': 'value() === null ? "" : null',
    '[attr.data-disabled]': 'effectiveDisabled() ? "" : null',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeyDown($event)',
    '(blur)': 'commit(); markTouched()',
  },
})
export class ForNumberInput
  extends FormUiControlBase
  implements FormValueControl<number | null>, ForNumberInputContext
{
  readonly #host = inject<ElementRef<HTMLInputElement>>(ElementRef);
  readonly #defaults = inject(FOR_NUMBER_INPUT_DEFAULTS);

  /**
   * Two-way bindable numeric value. Required by `FormValueControl<number | null>`.
   * `null` represents the empty input (reflected as `data-empty`); a parsed
   * number otherwise.
   */
  readonly value = model<number | null>(null);

  /**
   * Minimum value. Typed `number | undefined` to satisfy `FormUiControl.min`
   * (Signal Forms passes `undefined` when no `min` validator is bound). When
   * unset there is no lower bound.
   */
  readonly min = input<number | undefined>(undefined);

  /**
   * Maximum value. Typed `number | undefined` to satisfy `FormUiControl.max`.
   * When unset there is no upper bound.
   */
  readonly max = input<number | undefined>(undefined);

  /** Increment applied by ArrowUp / ArrowDown and the inc/dec buttons. */
  readonly step = input(1);

  /**
   * Multiplier applied to `step` for `PageUp` / `PageDown`. Defaults to the
   * value from `provideForNumberInputDefaults` for the surrounding scope (10).
   */
  readonly stepMultiplier = input(this.#defaults.stepMultiplier);

  /**
   * `Intl.NumberFormat` options for the displayed text and `aria-valuetext`.
   * When `null` (default) the raw number is shown and no `aria-valuetext` is
   * emitted (the numeric `aria-valuenow` already conveys the value).
   */
  readonly formatOptions = input<Intl.NumberFormatOptions | null>(null);

  /** BCP 47 locale for parsing and formatting. Defaults to the runtime locale. */
  readonly locale = input<string | null>(null);

  readonly #formatter = computed(() => {
    const options = this.formatOptions();
    return options ? new Intl.NumberFormat(this.locale() ?? undefined, options) : null;
  });

  readonly #separators = computed(() => localeSeparators(this.locale() ?? undefined));

  readonly #displayText = computed(() => {
    const current = this.value();
    if (current === null) {
      return '';
    }
    const formatter = this.#formatter();
    return formatter ? formatter.format(current) : String(current);
  });

  /**
   * Human-readable value for `aria-valuetext`. Only emitted when
   * `formatOptions` is set (the formatted text differs from `aria-valuenow`);
   * `null` otherwise so screen readers fall back to the numeric value.
   */
  readonly valueText = computed(() => {
    const current = this.value();
    if (current === null) {
      return null;
    }
    const formatter = this.#formatter();
    return formatter ? formatter.format(current) : null;
  });

  /**
   * Derived keyboard mode: `decimal` when fractional values are possible, else
   * `numeric`. Reads the formatter's *resolved* options so currency / percent
   * styles (which imply fraction digits the consumer never spelled out, e.g. 2
   * for most currencies) report their effective `maximumFractionDigits` rather
   * than the raw, un-resolved options object where those keys are absent.
   */
  readonly inputmode = computed<'numeric' | 'decimal'>(() => {
    const resolved = this.#formatter()?.resolvedOptions();
    const fractional =
      !Number.isInteger(this.step()) ||
      !this.#isWholeBound(this.min()) ||
      !this.#isWholeBound(this.max()) ||
      (resolved?.maximumFractionDigits ?? 0) > 0 ||
      (resolved?.minimumFractionDigits ?? 0) > 0;
    return fractional ? 'decimal' : 'numeric';
  });

  /** `true` when the value sits at (or below) `min`. */
  readonly atMin = computed(() => {
    const min = this.min();
    const current = this.value();
    return min !== undefined && current !== null && current <= min;
  });

  /** `true` when the value sits at (or above) `max`. */
  readonly atMax = computed(() => {
    const max = this.max();
    const current = this.value();
    return max !== undefined && current !== null && current >= max;
  });

  constructor() {
    super();
    reflectDisabled(this.effectiveDisabled);
    injectHiddenInput({
      name: this.name,
      values: computed(() => {
        const current = this.value();
        return current === null ? [] : [String(current)];
      }),
      disabled: this.effectiveDisabled,
    });

    // Register with an optional surrounding [forNumberInputGroup] so its
    // stepper buttons can drive this spinbutton. A standalone input (no
    // buttons) has no group and skips this entirely.
    const group = inject(FOR_NUMBER_INPUT_GROUP, { optional: true });
    if (group) {
      group.register(this);
      inject(DestroyRef).onDestroy(() => group.unregister(this));
    }

    // Mirror external writes (consumer `[(value)]` / `[formField]`, or the
    // post-commit reformat) into the native element while it isn't focused. Live
    // typing flows in through the `(input)` listener, and step / commit write the
    // display imperatively (the element is focused then, so this guard skips it).
    mirrorUnfocusedValue(() => this.#host.nativeElement, this.#displayText);
  }

  /**
   * Increase the value by `by` (defaults to `step`). From empty, lands on the
   * clamped baseline (`min ?? 0`). Clamps to `[min, max]`.
   */
  increment(by: number = this.step()): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    this.#applyValue(
      current === null ? this.#baseline() : roundToStepPrecision(current + by, this.step()),
    );
  }

  /**
   * Decrease the value by `by` (defaults to `step`). From empty, lands on the
   * clamped baseline (`min ?? 0`). Clamps to `[min, max]`.
   */
  decrement(by: number = this.step()): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const current = this.value();
    this.#applyValue(
      current === null ? this.#baseline() : roundToStepPrecision(current - by, this.step()),
    );
  }

  /** Live-parse the typed text into the value (unclamped — clamping waits for commit). */
  protected onInput(event: Event): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    const raw = (event.target as HTMLInputElement).value;
    if (raw.trim() === '') {
      this.value.set(null);
      return;
    }
    const parsed = parseLocaleNumber(raw, this.#separators());
    // Ignore unparseable input: keep the last valid value, leave the user's
    // in-progress text untouched; commit() reformats from the value on blur.
    if (parsed !== null) {
      this.value.set(parsed);
    }
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.increment();
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.decrement();
        return;
      case 'PageUp':
        event.preventDefault();
        this.increment(this.step() * this.stepMultiplier());
        return;
      case 'PageDown':
        event.preventDefault();
        this.decrement(this.step() * this.stepMultiplier());
        return;
      case 'Home': {
        const min = this.min();
        if (min !== undefined) {
          event.preventDefault();
          this.#applyValue(min);
        }
        return;
      }
      case 'End': {
        const max = this.max();
        if (max !== undefined) {
          event.preventDefault();
          this.#applyValue(max);
        }
        return;
      }
      case 'Enter':
        this.commit();
        return;
      default:
        return;
    }
  }

  /** Clamp the live value to `[min, max]` and reformat the displayed text. */
  protected commit(): void {
    const current = this.value();
    if (current !== null) {
      const clamped = this.#clamp(current);
      if (clamped !== current) {
        this.value.set(clamped);
      }
    }
    this.#writeDisplay();
  }

  #applyValue(raw: number): void {
    this.value.set(this.#clamp(raw));
    this.#writeDisplay();
  }

  #writeDisplay(): void {
    const el = this.#host.nativeElement;
    const text = this.#displayText();
    if (el.value !== text) {
      el.value = text;
    }
  }

  #baseline(): number {
    return this.#clamp(this.min() ?? 0);
  }

  #clamp(n: number): number {
    return clamp(n, this.min() ?? -Infinity, this.max() ?? Infinity);
  }

  #isWholeBound(bound: number | undefined): boolean {
    return bound === undefined || Number.isInteger(bound);
  }
}
