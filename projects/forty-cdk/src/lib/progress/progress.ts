import { booleanAttribute, computed, Directive, effect, inject, input, model } from '@angular/core';

import { LiveAnnouncer } from '../_internal/live-announcer/live-announcer';
import {
  FOR_PROGRESS_CONTEXT,
  type ForProgressContext,
  type ForProgressState,
} from './progress-context';
import { FOR_PROGRESS_DEFAULTS } from './progress-defaults';

/**
 * Headless progress bar. Implements the
 * [WAI-ARIA progressbar role](https://www.w3.org/TR/wai-aria-1.2/#progressbar)
 * for tasks whose completion is communicated visually.
 *
 * `value === null` puts the bar in **indeterminate** mode (no `aria-valuenow`).
 * Use it for "loading…" states whose duration cannot be predicted. Otherwise
 * pass a number in `[0, max]`; values outside the range are clamped before
 * being reflected.
 *
 * The directive only handles state and ARIA. The visual fill is up to the
 * consumer — see `ForProgressIndicator`.
 *
 * @example
 * ```html
 * <div forProgress [value]="uploaded()" [max]="total()">
 *   <div forProgressIndicator></div>
 * </div>
 *
 * <div forProgress [value]="null">  <!-- indeterminate -->
 *   <div forProgressIndicator></div>
 * </div>
 * ```
 */
@Directive({
  selector: '[forProgress]',
  exportAs: 'forProgress',
  host: {
    role: 'progressbar',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuenow]': 'clampedValue() ?? null',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.data-state]': 'state()',
    '[attr.data-value]': 'clampedValue() ?? null',
    '[attr.data-min]': '0',
    '[attr.data-max]': 'max()',
    '[attr.data-percentage]': 'percentageAttr()',
  },
  providers: [{ provide: FOR_PROGRESS_CONTEXT, useExisting: ForProgress }],
})
export class ForProgress implements ForProgressContext {
  readonly #defaults = inject(FOR_PROGRESS_DEFAULTS);

  /**
   * Two-way bindable. Current progress in `[0, max]`, or `null` for the
   * indeterminate state. Values outside the range are clamped for ARIA but
   * the model retains what the consumer wrote.
   */
  readonly value = model<number | null>(null);

  /** Maximum value. Defaults to `100` (so a raw value reads as a percentage). */
  readonly max = input<number>(100);

  /**
   * Optional override for `aria-valuetext`. Useful for non-percentage
   * progress (e.g. `"Step 3 of 5"`, `"42 MB of 200 MB"`). Receives the
   * clamped value and current max.
   */
  readonly getValueLabel = input<((value: number, max: number) => string) | null>(null);

  /**
   * When true, transitions to `value === max` are announced once via the
   * live announcer using the current `aria-valuetext` (or `"Complete"` if
   * none). Repeated transitions to the same complete state do not re-fire.
   * The default is read from `provideForProgressDefaults` for the
   * surrounding scope.
   */
  readonly announceCompletion = input(this.#defaults.announceCompletion, {
    transform: booleanAttribute,
  });

  readonly clampedValue = computed<number | null>(() => {
    const v = this.value();
    if (v === null) {
      return null;
    }
    const max = this.max();
    if (v <= 0) return 0;
    if (v >= max) return max;
    return v;
  });

  readonly percentage = computed<number | null>(() => {
    const v = this.clampedValue();
    if (v === null) {
      return null;
    }
    const max = this.max();
    if (max <= 0) {
      return 0;
    }
    return (v / max) * 100;
  });

  readonly state = computed<ForProgressState>(() => {
    const v = this.clampedValue();
    if (v === null) return 'indeterminate';
    return v === this.max() ? 'complete' : 'loading';
  });

  readonly ariaValueText = computed<string | null>(() => {
    const v = this.clampedValue();
    if (v === null) {
      return null;
    }
    const label = this.getValueLabel();
    if (label) {
      return label(v, this.max());
    }
    return null;
  });

  readonly percentageAttr = computed<number | null>(() => {
    const p = this.percentage();
    return p === null ? null : Math.round(p * 100) / 100;
  });

  readonly #announcer = inject(LiveAnnouncer);

  constructor() {
    let lastState: ForProgressState | null = null;
    effect(() => {
      const next = this.state();
      const prev = lastState;
      lastState = next;
      if (prev === null || prev === next) {
        return;
      }
      if (next === 'complete' && this.announceCompletion()) {
        this.#announcer.announce(this.ariaValueText() ?? 'Complete', 'polite');
      }
    });
  }
}
