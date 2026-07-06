import { Directive } from '@angular/core';

import { injectProgressContext } from './progress-context';

/**
 * Visual fill paired with `[forProgress]`. Reflects `data-state` and
 * `data-percentage` so the consumer can drive width / transform from CSS.
 *
 * The directive does NOT set any visual style itself. Typical usage:
 *
 * ```css
 * [forProgressIndicator] {
 *   width: 100%;
 *   transform: translateX(calc(-100% + var(--for-progress-percentage, 0%)));
 * }
 * [forProgressIndicator][data-state="indeterminate"] {
 *   animation: stripes 1s infinite linear;
 * }
 * ```
 *
 * with the `--for-progress-percentage` custom property fed from `data-percentage`.
 */
@Directive({
  selector: '[forProgressIndicator]',
  exportAs: 'forProgressIndicator',
  host: {
    '[attr.data-state]': 'context.state()',
    '[attr.data-value]': 'context.clampedValue() ?? null',
    '[attr.data-min]': '0',
    '[attr.data-max]': 'context.effectiveMax()',
    '[attr.data-percentage]': 'context.percentageAttr()',
    '[style.--for-progress-percentage]': 'percentageStyle()',
  },
})
export class ForProgressIndicator {
  protected readonly context = injectProgressContext('ForProgressIndicator');

  protected percentageStyle(): string | null {
    const p = this.context.percentageAttr();
    return p === null ? null : `${p}%`;
  }
}
