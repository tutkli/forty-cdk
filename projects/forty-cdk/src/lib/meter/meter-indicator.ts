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
    '[attr.data-min]': 'context.min()',
    '[attr.data-max]': 'context.max()',
    '[attr.data-percentage]': 'percentageAttr()',
    '[style.--for-meter-percentage]': 'percentageStyle()',
  },
})
export class ForMeterIndicator {
  protected readonly context = injectMeterContext('ForMeterIndicator');

  protected percentageAttr(): number {
    return Math.round(this.context.percentage() * 100) / 100;
  }

  protected percentageStyle(): string {
    return `${this.percentageAttr()}%`;
  }
}
