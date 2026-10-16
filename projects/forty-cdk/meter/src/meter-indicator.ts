import { Directive } from '@angular/core';

import { injectMeterContext } from './meter-context';

/**
 * Visual fill paired with `[forMeter]`. Reflects `data-quality`,
 * `data-percentage`, and the CSS custom property `--for-meter-percentage`
 * so the consumer can drive width / transform from CSS.
 */
@Directive({
  selector: '[forMeterIndicator]',
  exportAs: 'forMeterIndicator',
  host: {
    '[attr.data-quality]': 'context.quality()',
    '[attr.data-value]': 'context.clampedValue()',
    '[attr.data-min]': 'context.sanitizedMin()',
    '[attr.data-max]': 'context.sanitizedMax()',
    '[attr.data-percentage]': 'context.percentageAttr()',
    '[style.--for-meter-percentage]': 'percentageStyle()',
  },
})
export class ForMeterIndicator {
  private readonly context = injectMeterContext('ForMeterIndicator');

  private percentageStyle(): string {
    return `${this.context.percentageAttr()}%`;
  }
}
