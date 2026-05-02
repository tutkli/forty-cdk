import { Directive, inject } from '@angular/core';

import { FOR_PROGRESS_CONTEXT } from './progress-context';

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
    '[attr.data-value]': 'context.value() ?? null',
    '[attr.data-max]': 'context.max()',
    '[attr.data-percentage]': 'percentageAttr()',
    '[style.--for-progress-percentage]': 'percentageStyle()',
  },
})
export class ForProgressIndicator {
  protected readonly context = inject(FOR_PROGRESS_CONTEXT, { optional: true })!;

  constructor() {
    if (!this.context) {
      throw new Error(
        '[forty-cdk/progress] ForProgressIndicator must be used inside a [forProgress] element.',
      );
    }
  }

  protected percentageAttr(): number | null {
    const p = this.context.percentage();
    return p === null ? null : Math.round(p * 100) / 100;
  }

  protected percentageStyle(): string | null {
    const p = this.percentageAttr();
    return p === null ? null : `${p}%`;
  }
}
