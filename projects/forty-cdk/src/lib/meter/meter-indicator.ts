import { Directive, inject } from '@angular/core';

import { FOR_METER_CONTEXT } from './meter-context';

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
  protected readonly context = inject(FOR_METER_CONTEXT, { optional: true })!;

  constructor() {
    if (!this.context) {
      throw new Error(
        '[forty-cdk/meter] ForMeterIndicator must be used inside a [forMeter] element.',
      );
    }
  }

  protected percentageAttr(): number {
    return Math.round(this.context.percentage() * 100) / 100;
  }

  protected percentageStyle(): string {
    return `${this.percentageAttr()}%`;
  }
}
