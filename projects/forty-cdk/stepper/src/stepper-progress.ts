import { computed, Directive, inject, input } from '@angular/core';

import { injectStepperContext } from './stepper-context';
import { FOR_STEPPER_DEFAULTS } from './stepper-defaults';

/**
 * Optional progress indicator for the Stepper. Reads the stepper context and
 * reflects how far through the steps the user is as a WAI-ARIA
 * [`progressbar`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/progressbar_role):
 * `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow` = the computed
 * percent, and an `aria-valuetext` describing the position. Publishes a
 * `--for-stepper-progress` (0–1) custom property for styling; ships no visuals.
 *
 * Must be used inside a `[forStepper]` element.
 */
@Directive({
  selector: '[forStepperProgress]',
  exportAs: 'forStepperProgress',
  host: {
    role: 'progressbar',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.data-orientation]': 'ctx.orientation()',
    '[style.--for-stepper-progress]': 'percent() / 100',
  },
})
export class ForStepperProgress {
  protected readonly ctx = injectStepperContext('ForStepperProgress');
  readonly #defaults = inject(FOR_STEPPER_DEFAULTS);

  /**
   * Basis for the reported percent. `'index'` (default) derives progress from
   * the current step index; `'completed'`
   * derives it from the count of steps whose resolved state is `completed`.
   */
  readonly valueBy = input<'index' | 'completed'>('index');

  /**
   * Accessible name for the progressbar. Defaults to `null`, emitting no
   * `aria-label`; prefer a visible label referenced via `aria-labelledby` when
   * one exists.
   */
  readonly ariaLabel = input<string | null>(null);

  readonly #completedCount = computed<number>(() => {
    const total = this.ctx.count();
    let n = 0;
    for (let i = 0; i < total; i++) {
      if (this.ctx.resolvedStateFor(i) === 'completed') {
        n++;
      }
    }
    return n;
  });

  readonly #value = computed<number>(() =>
    this.valueBy() === 'completed' ? this.#completedCount() : this.ctx.selectedIndex(),
  );

  /**
   * Progress as a whole-number percent in `[0, 100]`, reflected to
   * `aria-valuenow` and (divided by 100) to the `--for-stepper-progress`
   * custom property.
   */
  readonly percent = computed<number>(() => {
    const total = this.ctx.count();
    if (total <= 1) {
      return total === 1 && this.#value() >= 1 ? 100 : 0;
    }
    const raw = Math.round((this.#value() / (total - 1)) * 100);
    return Math.min(100, Math.max(0, raw));
  });

  /**
   * Human-readable position string reflected to `aria-valuetext`: `"Step X of N"`
   * on the `'index'` basis, `"P% complete"` on the `'completed'` basis. Both
   * strings are built from the scope's `stepValueText` / `progressValueText`
   * defaults, localizable via `provideForStepperDefaults`.
   */
  readonly valueText = computed<string>(() =>
    this.valueBy() === 'completed'
      ? this.#defaults.progressValueText(this.percent())
      : this.#defaults.stepValueText(
          Math.min(this.ctx.selectedIndex() + 1, this.ctx.count()),
          this.ctx.count(),
        ),
  );
}
