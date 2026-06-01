import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrimitivePage } from '../../ui/primitive-page';
import { MeterExample } from './examples/meter.example';
import { MeterValueLabelExample } from './examples/value-label.example';

@Component({
  selector: 'app-meter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrimitivePage, MeterExample, MeterValueLabelExample],
  template: `
    <primitive-page slug="meter">
      <app-meter-example />
      <app-meter-value-label-example />
    </primitive-page>
  `,
})
export class MeterPage {}
