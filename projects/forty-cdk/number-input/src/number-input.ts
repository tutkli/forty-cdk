import { computed, DestroyRef, Directive, ElementRef, inject, input, model } from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import {
  reflectDisabled,
  FormUiControlBase,
  mirrorUnfocusedValue,
  injectHiddenInput,
  clamp,
  decimalPlaces,
  roundToDecimals,
  stepOnGrid,
} from 'forty-cdk/core';
import { localeSeparators, parseLocaleNumber } from './locale-number';
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
 * visible element is itself the submittable field. The visible spinbutton's own
 * `name` attribute is suppressed (`[attr.name]="null"`), so a consumer-set
 * static `name` feeds only the hidden input and never double-submits its
 * formatted display text alongside the raw value.
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
    '[attr.name]': 'null',
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

  /**
   * Increment applied by ArrowUp / ArrowDown and the inc/dec buttons. Values
   * snap to the `min ?? 0` ± k·`step` grid: a value already on the grid moves a
   * full step, an off-grid value lands on the adjacent grid point.
   */
  readonly step = input(1);

  /**
   * Multiplier applied to `step` for `PageUp` / `PageDown`. Defaults to the
   * value from `provideForNumberInputDefaults` for the surrounding scope (10).
   * It applies only from a value already on the `min ?? 0` ± k·`step` grid —
   * from an off-grid value the key lands on the adjacent grid point instead,
   * matching the platform `stepUp()` / `stepDown()` rule.
   */
  readonly stepMultiplier = input(this.#defaults.stepMultiplier);

  /**
   * `Intl.NumberFormat` options for the displayed text and `aria-valuetext`.
   * When `null` (default) the raw number is shown and no `aria-valuetext` is
   * emitted (the numeric `aria-valuenow` already conveys the value).
   *
   * With `style: 'percent'` the model value stays the fraction Intl formats
   * from (`0.5` displays as `"50%"`); parsing divides typed input back by 100 so
   * the round-trip is loss-free (editing `"50%"` to `"51%"` yields `0.51`, not
   * `51`). `min` / `max` are therefore also expressed in that fractional scale.
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
   * clamped baseline (`min ?? 0`). Stepping follows the shared grid-snap rule:
   * a value already on the `min ?? 0` ± k·`step` grid advances a full `by` (so a
   * caller-supplied `by` finer than `step` — `increment(0.25)` with `step=0.1` —
   * keeps its own precision), while an off-grid value lands on the next grid
   * point above it (ArrowUp from `0.55` with `step=1` gives `1`, not `1.55`).
   * Clamps to `[min, max]`.
   */
  increment(by: number = this.step()): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.#step(1, by);
  }

  /**
   * Decrease the value by `by` (defaults to `step`). From empty, lands on the
   * clamped baseline (`min ?? 0`). Follows the same grid-snap rule as
   * {@link increment}, travelling downward. Clamps to `[min, max]`.
   */
  decrement(by: number = this.step()): void {
    if (this.effectiveDisabled() || this.readonly()) {
      return;
    }
    this.#step(-1, by);
  }

  /**
   * Widened to `public` so `ForNumberInputContext` consumers — the
   * `[forNumberInputIncrement]` / `[forNumberInputDecrement]` buttons — can mark
   * the control touched on a pointer commit; the behaviour is the base's. Fires
   * on every touch-producing interaction (a stepper click, and focus leaving the
   * spinbutton), so a gesture that does both emits `touch` twice. `touched` /
   * `data-touched` / `(touchedChange)` only change on the first, and Signal
   * Forms' `markAsTouched()` is idempotent.
   */
  override markTouched(): void {
    super.markTouched();
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
    const parsed = parseLocaleNumber(raw, this.#separators(), { lenientGrouping: true });
    // Ignore unparseable input: keep the last valid value, leave the user's
    // in-progress text untouched; commit() reformats from the value on blur.
    if (parsed !== null) {
      this.value.set(this.#toModelValue(parsed));
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
        this.increment(this.#pageStep());
        return;
      case 'PageDown':
        event.preventDefault();
        this.decrement(this.#pageStep());
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

  #step(direction: 1 | -1, by: number): void {
    const current = this.value();
    this.#applyValue(
      current === null
        ? this.#baseline()
        : stepOnGrid(current, { step: this.step(), direction, origin: this.min() ?? 0, by }),
    );
  }

  #pageStep(): number {
    return roundToDecimals(this.step() * this.stepMultiplier(), decimalPlaces(this.step()));
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

  #toModelValue(parsed: number): number {
    return this.#formatter()?.resolvedOptions().style === 'percent' ? parsed / 100 : parsed;
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
